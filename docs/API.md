# مرجع API رُمّان

**الجذر:** `http://localhost:4000/api/v1`
**المصادقة:** `Authorization: Bearer <access_token>`

## شكل الاستجابة

نجاح:
```json
{ "success": true, "message": "…أو null", "data": { }, "meta": { } }
```
`meta` تظهر في القوائم المرقّمة فقط: `{ page, limit, total, totalPages, hasNext, hasPrev }`

خطأ:
```json
{
  "success": false,
  "message": "تحقّق من البيانات المُدخلة",
  "code": "VALIDATION_ERROR",
  "errors": { "email": "بريد إلكتروني غير صالح" }
}
```

| الكود | المعنى |
|---|---|
| `400` | طلب غير صالح |
| `401` | غير مسجّل / توكن منتهٍ (`TOKEN_EXPIRED` ⇒ جدّد ثم أعد المحاولة) |
| `403` | لا صلاحية |
| `404` | غير موجود |
| `409` | تعارض (مثل `STOCK_CHANGED`) |
| `422` | فشل تحقّق — يحتوي `errors` بمفاتيح الحقول |
| `429` | تجاوزت حدّ المعدّل |

---

## المصادقة `/auth`

| الطريقة | المسار | الوصف |
|---|---|---|
| `POST` | `/auth/register` | حساب جديد + 100 نقطة ترحيبية |
| `POST` | `/auth/login` | دخول بالبريد **أو** رقم الهاتف |
| `POST` | `/auth/refresh` | تجديد الجلسة (يُبطل التوكن القديم) |
| `POST` | `/auth/logout` | خروج من الجهاز الحالي |
| `POST` | `/auth/logout-all` 🔒 | خروج من كل الأجهزة |
| `GET` | `/auth/me` 🔒 | المستخدم الحالي |
| `GET` | `/auth/sessions` 🔒 | الأجهزة النشطة |
| `POST` | `/auth/change-password` 🔒 | تغيير كلمة المرور (يُخرج كل الأجهزة) |
| `POST` | `/auth/forgot-password` | طلب رابط استعادة (لا يكشف إن كان البريد مسجّلًا) |
| `POST` | `/auth/reset-password` | تعيين كلمة مرور جديدة بالرمز |
| `POST` | `/auth/verify-email` | تفعيل البريد بالرمز |
| `POST` | `/auth/resend-verification` 🔒 | إعادة إرسال رابط التفعيل |

```http
POST /auth/login
{ "identifier": "you@your-domain.com", "password": "…" }

200 → { "data": { "user": {…}, "tokens": { "access_token": "…", "refresh_token": "…" } } }
```

> `forgot-password` يعيد نفس الرسالة سواء وُجد البريد أم لا، ولا يُرجع
> الرمز في الاستجابة أبدًا — ولا حتى في بيئة التطوير.

---

## الفروع `/branches`

| الطريقة | المسار | المعاملات |
|---|---|---|
| `GET` | `/branches` | `lat` `lng` `city` — مع `lat/lng` تُرتَّب بالأقرب |
| `GET` | `/branches/nearest` | `lat` `lng` (مطلوبان) |
| `GET` | `/branches/:slugOrId` | تفاصيل + مواعيد + مناطق توصيل + إحصاءات |

كل فرع يعود معه `is_open_now` محسوبًا (يتعامل مع الإغلاق بعد منتصف الليل)
و`distance_km` إن أُرسل الموقع.

---

## الأقسام `/categories`

| الطريقة | المسار | المعاملات |
|---|---|---|
| `GET` | `/categories` | `branch_id` `featured` — العدّاد يُحسب من مخزون الفرع |
| `GET` | `/categories/:slug` | `branch_id` — يعيد نطاق الأسعار داخل القسم |

---

## المنتجات `/products`

```http
GET /products?branch_id=1&category=produce&sort=price_asc&page=1&limit=24
```

| المعامل | القيم |
|---|---|
| `branch_id` | يحدّد السعر والتوفّر (بدونه: سعر الكتالوج العام) |
| `category` · `brand` | slug |
| `search` | نص (يغطي الاسم عربي/إنجليزي والوصف والمُنتِج) |
| `min_price` · `max_price` · `min_rating` | أرقام |
| `organic` · `exclusive` · `featured` · `on_sale` · `in_stock` | `true` |
| `sort` | `featured` \| `newest` \| `price_asc` \| `price_desc` \| `rating` \| `popular` \| `name` |
| `page` · `limit` | الترقيم (الحد الأقصى 100) |

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/products/:slug` | تفاصيل + توفّر في كل الفروع + مشابه + «يُشترى معه» |
| `GET` | `/products/suggest` | `q` `branch_id` — اقتراحات فورية + الأكثر بحثًا |
| `GET` | `/products/trending` | أكثر كلمات البحث خلال 30 يومًا |
| `GET` | `/products/recently-viewed` 🔒 | آخر ما شاهده العميل |

---

## السلة `/cart` 🔒

كل المسارات تحتاج `branch_id` لأن السلة مرتبطة بفرع.

| الطريقة | المسار | الجسم |
|---|---|---|
| `GET` | `/cart?branch_id=1` | — |
| `POST` | `/cart/items` | `{ branch_id, product_id, quantity, note? }` |
| `PATCH` | `/cart/items/:productId` | `{ branch_id, quantity }` (صفر = حذف) |
| `DELETE` | `/cart/items/:productId?branch_id=1` | — |
| `DELETE` | `/cart?branch_id=1` | إفراغ السلة |
| `POST` | `/cart/coupon` | `{ branch_id, code }` |
| `DELETE` | `/cart/coupon?branch_id=1` | إزالة الكوبون |
| `POST` | `/cart/merge` | `{ branch_id, items: [{product_id, quantity}] }` |

الاستجابة تحتوي دائمًا `items` (مع `issues` لكل صنف) و`totals` و`has_issues`.

---

## الطلبات `/orders`

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/orders/slots` | `branch_id` `date` — الشرائح والسعة المتبقية |
| `POST` | `/orders` 🔒 | إنشاء طلب من السلة |
| `GET` | `/orders` 🔒 | طلباتي (`status` `page` `limit`) |
| `GET` | `/orders/:orderNumber` 🔒 | تفاصيل + خط زمني + عنوان + دفع |
| `POST` | `/orders/:orderNumber/cancel` 🔒 | إلغاء (قبل بدء التجهيز) |
| `POST` | `/orders/:orderNumber/reorder` 🔒 | إضافة أصناف الطلب للسلة |
| `POST` | `/orders/:orderNumber/rate` 🔒 | تقييم تجربة التوصيل 1–5 |
| `PATCH` | `/orders/:orderNumber/status` 👤 | تغيير الحالة (فريق الفرع فأعلى) |

```http
POST /orders
{
  "branch_id": 1,
  "fulfillment_type": "delivery",
  "address_id": 3,
  "payment_method": "cod",
  "slot_date": "2026-09-12", "slot_from": "12:00", "slot_to": "15:00",
  "use_points": 200,
  "customer_note": "الفاكهة ناضجة من فضلك"
}
```

أخطاء محتملة: `CART_ISSUES` · `BELOW_MINIMUM` · `STOCK_CHANGED` ·
`ADDRESS_REQUIRED` · `INSUFFICIENT_WALLET` · `INVALID_TRANSITION`.

---

## بقية المسارات

| المجموعة | أبرز النقاط |
|---|---|
| `/users` 🔒 | `GET/PATCH /profile` · `GET /summary` · `GET /wallet` |
| `/addresses` 🔒 | `GET` · `POST` · `PATCH /:id` · `DELETE /:id` |
| `/wishlist` 🔒 | `GET` · `GET /ids` · `POST /toggle` · `DELETE /:productId` |
| `/reviews` | `GET /product/:id` (عام) · `POST` 🔒 (يتطلّب شراءً مسلّمًا) · `PATCH/DELETE /:id` 🔒 · `POST /:id/helpful` 🔒 · `GET /pending` 🔒 |
| `/coupons` | `GET` (الفعّالة) · `POST /validate` 🔒 |
| `/notifications` 🔒 | `GET` · `POST /:id/read` · `POST /read-all` |
| `/loyalty` | `GET /tiers` (عام) · `GET /` 🔒 |
| `/content` | `GET /promotions` · `POST /contact` · `POST /newsletter` |
| `/analytics` 👤 | `GET /overview` (`days` `branch_id`) · `GET /branches` · `GET /queue` |

🔒 يتطلّب تسجيل دخول  ·  👤 يتطلّب صلاحية فريق (مدير فرع فأعلى)

---

## حدود المعدّل

| النطاق | الحد |
|---|---|
| عام | 200 طلب / دقيقة |
| المصادقة | 12 محاولة / 15 دقيقة (المحاولات الناجحة لا تُحتسب) |
| الكتابة (طلبات، تقييمات، رسائل) | 30 / دقيقة |

## فحص الصحّة

```http
GET /health
→ { "success": true, "status": "ok", "service": "rumman-api", "uptime_seconds": 1240 }
```


---

## المحتوى العام `/content`

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/content/site` | بيانات المتجر: العلامة، التواصل، الأعداد الفعلية، حدّ التوصيل المجاني، العروض السارية |
| `GET` | `/content/promotions` | المساحات التحريرية النشطة |
| `POST` | `/content/contact` | رسالة خدمة عملاء |
| `POST` | `/content/newsletter` | اشتراك في النشرة |

`GET /content/site` هو ما يمنع الواجهة من كتابة أرقام مخترعة:

```json
{
  "brand": { "name": "رُمّان", "tagline": "مائدة تستحقّ الأفضل" },
  "support": { "phone": "…", "email": "…" },
  "counts": { "branches": 3, "categories": 12, "products": 480, "governorates": 2 },
  "free_delivery_from": 500,
  "announcements": [{ "text": "…", "href": "/offers" }],
  "store_open": true
}
```

---

## الدفع `/payments`

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/payments/methods` | الوسائل المفعّلة فعليًا + تعليماتها |
| `POST` | `/payments/fawry/notify` | إشعار فوري — **بلا مصادقة**، محميّ بالتوقيع |
| `POST` | `/payments/instapay/:orderNumber/proof` 🔒 | رفع إيصال التحويل (multipart) |
| `GET` | `/payments/review-queue` 🛡 | التحويلات المنتظرة مراجعة |
| `POST` | `/payments/instapay/:orderNumber/review` 🛡 | اعتماد أو رفض |
| `POST` | `/payments/fawry/:orderNumber/refresh` 🛡 | استعلام يدوي من فوري |
| `POST` | `/payments/cod/:orderNumber/collect` 🛡 | تسجيل تحصيل نقدي |

🔒 = يتطلّب دخولًا · 🛡 = مدير فرع فما فوق

**رفع الإيصال** — `multipart/form-data`:

```
proof=<ملف صورة>          مطلوب · JPG/PNG/WEBP · يُفحَص محتواه لا امتداده
sender_name=<نص>          اختياري — يسرّع المطابقة
transfer_reference=<نص>   اختياري — رقم العملية
```

انتقالات حالة الدفع:

```
cod        unpaid ──(تسليم/تحصيل)──> paid
instapay   awaiting_payment ──(رفع إيصال)──> under_review
                              ├──(اعتماد)──> paid
                              └──(رفض)─────> awaiting_payment
fawry      awaiting_payment ──(إشعار فوري)──> paid | failed | expired
wallet     paid (فورًا)
```

---

## الإدارة `/admin`

كل المسارات تتطلّب دخولًا. ما يبني هوية المتجر للمدير العام وحده،
وما يخصّ التشغيل اليومي لمدير الفرع فما فوق.

| المجموعة | المسارات | الصلاحية |
|---|---|---|
| الجاهزية | `GET /admin/readiness` · `GET /admin/health` | مدير فرع / مدير عام |
| الفروع | `GET,POST /admin/branches` · `GET,PATCH,DELETE /admin/branches/:id` · `GET,PUT /admin/branches/:id/hours` · `GET,POST /admin/branches/:id/zones` | مدير عام |
| الأقسام | `/admin/categories` (+ `POST /reorder`) | مدير عام |
| العلامات | `/admin/brands` | مدير عام |
| المنتجات | `/admin/products` (+ `/:id/images`) | مدير عام |
| الاستيراد | `GET /admin/import/columns` · `GET /admin/import/template` · `POST /admin/import/products` | مدير عام |
| المخزون | `GET,PUT /admin/inventory` · `POST /admin/inventory/adjust` · `POST /admin/inventory/bulk` · `GET /admin/inventory/movements` | مدير فرع |
| الطلبات | `GET /admin/orders` | مدير فرع |
| الكوبونات | `/admin/coupons` | مدير عام |
| العروض | `/admin/promotions` (+ `POST /reorder`) | مدير عام |
| المستخدمون | `GET /admin/users` · `POST /admin/users/staff` · `PATCH /admin/users/:id` | مدير عام |
| الإعدادات | `GET,PUT /admin/settings` | مدير عام |
| التدقيق | `GET /admin/audit` | مدير عام |

**استيراد المنتجات:**

```http
POST /admin/import/products
{ "csv": "<محتوى الملف>", "commit": false, "branch_id": 1 }

200 → { "data": { "mode": "preview", "valid_count": 120, "error_count": 3,
                  "errors": [{ "line": 7, "name": "…", "problems": ["السعر مطلوب"] }],
                  "sample": [...] } }
```

`commit: true` يُرفض بـ `422` إن كان في الملف خطأ واحد. التطبيق في
معاملة واحدة — إمّا الكل أو لا شيء.

**حماية الحقول المحسوبة:** `rating_avg` و`sold_count` و`view_count`
و`used_count` و`reserved` غائبة عن كل قوائم الكتابة البيضاء. إرسالها
يُهمَل بصمت ولا يُعدّل شيئًا.
