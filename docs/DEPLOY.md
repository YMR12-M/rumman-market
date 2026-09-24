# النشر

دليل تشغيل رُمّان على خادم إنتاج.

---

## ١) قبل أي شيء — قائمة التحقّق

الخادم **يرفض الإقلاع** إن نقص أيٌّ من المطلوبات، ويقول لك أيّها
بالضبط برسالة عربية. لكن راجع هذه القائمة أولًا لتوفّر الوقت:

```bash
# ولّد كل سرّ بأمر مستقلّ — لا تنسخ واحدًا مرّتين
openssl rand -base64 48
```

| الإعداد | القيمة المطلوبة |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | عشوائي، 32 حرفًا فأكثر |
| `JWT_REFRESH_SECRET` | عشوائي، **مختلف عن الأول** |
| `CLIENT_ORIGIN` | `https://your-domain.com` — بلا localhost وبلا `*` |
| `APP_URL` | نفس نطاق الواجهة (تُبنى منه روابط البريد) |
| `API_PUBLIC_URL` | `https://api.your-domain.com` |
| `SUPPORT_EMAIL` / `SUPPORT_PHONE` | بيانات حقيقية — تظهر في كل رسالة |
| `RESEND_API_KEY` | مفتاح فعّال ونطاق موثّق |
| `FAWRY_BASE_URL` | `https://www.atfawry.com` (لا staging) |

بعد التشغيل افتح `/admin/settings` — تعرض حالة هذه الإعدادات كلّها
للتحقّق البصري.

---

## ٢) قاعدة البيانات

```sql
CREATE DATABASE rumman_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rumman'@'localhost' IDENTIFIED BY 'كلمة-مرور-قوية';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON rumman_market.* TO 'rumman'@'localhost';
FLUSH PRIVILEGES;
```

ثم:

```bash
npm run db:migrate     # ⚠ يمسح كل الجداول ويعيد إنشاءها
npm run db:bootstrap   # الإعدادات + حساب المدير (آمن للتكرار)
```

> `db:migrate` للتنصيب الأول فقط. تشغيله على قاعدة عاملة **يمسح كل
> البيانات**.

---

## ٣) بناء الواجهة

```bash
npm run build
```

الناتج في `client/dist` — ملفات ثابتة تُقدَّم من Nginx أو CDN.

إن كان الـ API على نطاق فرعي مختلف، اضبط قبل البناء:

```bash
# client/.env.production
VITE_API_URL=https://api.your-domain.com/api/v1
```

---

## ٤) تشغيل الخادم

### مع systemd

```ini
# /etc/systemd/system/rumman-api.service
[Unit]
Description=Rumman API
After=network.target mysql.service

[Service]
Type=simple
User=rumman
WorkingDirectory=/var/www/rumman/server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# تقييد الصلاحيات — الخادم لا يحتاج أكثر من هذا
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/rumman/server/uploads

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now rumman-api
sudo journalctl -u rumman-api -f
```

### مع Docker

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## ٥) Nginx

```nginx
# الواجهة
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  root /var/www/rumman/client/dist;
  index index.html;

  # ترويسات أمان — الواجهة هي من يقدّم الصفحة فهي من يضبط السياسة
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.your-domain.com; frame-ancestors 'self'" always;

  # الأصول ببصمة في الاسم — تُخزَّن للأبد
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # تطبيق صفحة واحدة: كل مسار غير موجود يعود إلى index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  gzip_min_length 1024;
}

# الـ API
server {
  listen 443 ssl http2;
  server_name api.your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

  # حدّ حجم الطلب: يتّسع لملف استيراد كبير ولصورة مرفوعة
  client_max_body_size 12m;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}

# إعادة توجيه HTTP → HTTPS
server {
  listen 80;
  server_name your-domain.com api.your-domain.com;
  return 301 https://$host$request_uri;
}
```

> الخادم يقرأ `X-Forwarded-For` (`trust proxy` مضبوط) — فحدود المعدّل
> تعمل على عنوان العميل الحقيقي لا على عنوان البروكسي.

---

## ٦) فوري — نقطة الإشعار

سجّل في لوحة تاجر فوري:

```
https://api.your-domain.com/api/v1/payments/fawry/notify
```

النقطة مفتوحة بلا مصادقة عمدًا (فوري تستدعيها من خوادمها)، وحمايتها
من **التوقيع** لا من غيره. كل إشعار يُؤرشَف في `payment_webhooks` قبل
معالجته، فالتكرار يُتجاهَل ويبقى أثرٌ كامل لأي خلاف.

اختبر أولًا على `https://atfawry.fawrystaging.com`.

---

## ٧) النسخ الاحتياطي

شيئان لا غنى عنهما:

```bash
#!/usr/bin/env bash
# /usr/local/bin/rumman-backup
set -euo pipefail

STAMP=$(date +%F-%H%M)
DEST=/var/backups/rumman

mkdir -p "$DEST"

# قاعدة البيانات — single-transaction لا يقفل الجداول أثناء النسخ
mysqldump --single-transaction --routines --triggers \
  -u rumman -p"$DB_PASSWORD" rumman_market | gzip > "$DEST/db-$STAMP.sql.gz"

# الملفات المرفوعة — صور المنتجات وإيصالات التحويل
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C /var/www/rumman/server uploads

# نحتفظ بـ 30 يومًا
find "$DEST" -name '*.gz' -mtime +30 -delete
```

```cron
0 3 * * * /usr/local/bin/rumman-backup >> /var/log/rumman-backup.log 2>&1
```

> إيصالات التحويل **دليل مالي**. فقدانها يعني فقدان إثبات الدفع.

---

## ٨) المراقبة

```bash
curl -fsS https://api.your-domain.com/health
```

يرجع `200` مع `uptime_seconds`. اربطه بأي خدمة مراقبة.

ما يستحقّ تنبيهًا:

| الحدث | لماذا |
|---|---|
| `/health` لا يرد | الخدمة متوقّفة |
| `تعذّر الاتصال بقاعدة البيانات` في السجلّ | القاعدة أو الشبكة |
| `فوري رفضت الطلب` متكرّر | مفاتيح خاطئة أو عطل لدى المزوّد |
| `فشل إرسال البريد` متكرّر | مفتاح Resend أو حصّة النطاق |
| `إشعار فوري بتوقيع غير صالح` | مفتاح أمان خاطئ — أو محاولة تزوير |

---

## ٩) التحديث

```bash
cd /var/www/rumman
git pull
npm run install:all
npm run build
sudo systemctl restart rumman-api
```

> **لا تشغّل `db:migrate` في التحديث** — هو ينشئ الجداول من الصفر.
> تغييرات المخطّط تُطبَّق بـ `ALTER TABLE` يدويًا بعد أخذ نسخة احتياطية.
