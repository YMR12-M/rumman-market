/**
 * ═══════════════════════════════════════════════════════════════
 *  تهيئة أوّل تشغيل — لا بيانات تجريبية
 *
 *  هذا السكربت لا يخترع فروعًا ولا منتجات ولا طلبات. يفعل شيئين فقط:
 *    1) يكتب الإعدادات العامة التي يحتاجها النظام ليعمل.
 *    2) ينشئ حساب المدير الأول الذي تدخل به لتبني متجرك الحقيقي.
 *
 *  كل ما بعد ذلك — الفروع والأقسام والمنتجات والمخزون والكوبونات —
 *  يُدخَل من لوحة الإدارة، لأن هذه بيانات عملك أنت لا بيانات عيّنة.
 *
 *  السكربت **آمن للتكرار**: لا يمسح شيئًا. إن وُجد مدير أخبرك وخرج.
 *
 *  التشغيل:  npm run db:bootstrap
 *  البيانات تُقرأ من server/.env (ADMIN_EMAIL / ADMIN_PASSWORD ...)
 *  أو تُمرَّر كوسائط:  npm run db:bootstrap -- --email=... --password=...
 * ═══════════════════════════════════════════════════════════════
 */
import crypto from 'node:crypto';
import { pool, queryOne, execute } from '../config/db.js';
import { hashPassword } from '../utils/security.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/* ── قراءة الوسائط من سطر الأوامر: --key=value ─────────────────── */
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split('=');
      return [key.replace(/-/g, '_'), rest.join('=')];
    }),
);

const pickValue = (key, envKey) => args[key] || process.env[envKey] || '';

/* ── تحقّقات المدخلات ──────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^01[0125][0-9]{8}$/;

/**
 * كلمة مرور المدير تحمي المتجر كلّه، فالحدّ الأدنى هنا أعلى من حدّ
 * العملاء: 12 حرفًا وثلاث فئات مختلفة على الأقل.
 */
function validatePassword(password) {
  const issues = [];
  if (password.length < 12) issues.push('12 حرفًا على الأقل');

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]
    .filter((pattern) => pattern.test(password)).length;
  if (classes < 3) issues.push('ثلاث فئات على الأقل من: حروف صغيرة، كبيرة، أرقام، رموز');

  if (/^(.)\1+$/.test(password)) issues.push('ليست حرفًا مكرّرًا');
  return issues;
}

/** الإعدادات التي يقرأها النظام من القاعدة — تُكتب مرّة ثم تُدار من اللوحة */
function defaultSettings() {
  return [
    ['brand_name_ar',        env.brand.name,                    'brand'],
    ['brand_tagline',        env.brand.tagline,                 'brand'],
    ['support_phone',        env.brand.supportPhone,            'contact'],
    ['support_email',        env.brand.supportEmail,            'contact'],
    ['points_per_egp',       String(env.business.pointsPerEgp),  'loyalty'],
    ['point_value_egp',      String(env.business.pointValueEgp), 'loyalty'],
    ['max_points_redemption_percent', String(env.business.maxPointsRedemptionPercent), 'loyalty'],
    ['default_tax_rate',     String(env.business.defaultTaxRate), 'finance'],
    ['currency_code',        'EGP',                             'finance'],
    ['store_status',         'open',                            'general'],
  ];
}

async function bootstrap() {
  const name     = pickValue('name',     'ADMIN_NAME');
  const email    = pickValue('email',    'ADMIN_EMAIL').toLowerCase().trim();
  const phone    = pickValue('phone',    'ADMIN_PHONE').trim();
  const password = pickValue('password', 'ADMIN_PASSWORD');

  /* ── 1) الإعدادات العامة ──────────────────────────────────── */
  // ON DUPLICATE KEY UPDATE بلا تغيير: نكتب الناقص ولا ندهس ما عدّلته اللوحة
  for (const [key, value, group] of defaultSettings()) {
    await execute(
      'INSERT INTO settings (`key`, `value`, `group`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE `key` = `key`',
      [key, value ?? '', group],
    );
  }
  logger.success('الإعدادات العامة جاهزة');

  /* ── 2) حساب المدير الأول ─────────────────────────────────── */
  const existingAdmin = await queryOne(
    "SELECT id, email FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1",
  );

  if (existingAdmin) {
    logger.info(`يوجد مدير بالفعل (${existingAdmin.email}) — لم يُنشأ حساب جديد.`);
    logger.info('لإضافة مدير آخر استخدم لوحة الإدارة › المستخدمون.');
    return;
  }

  const missing = [];
  if (!name)     missing.push('ADMIN_NAME (أو --name=)');
  if (!email)    missing.push('ADMIN_EMAIL (أو --email=)');
  if (!phone)    missing.push('ADMIN_PHONE (أو --phone=)');
  if (!password) missing.push('ADMIN_PASSWORD (أو --password=)');

  if (missing.length > 0) {
    logger.warn('لم يُنشأ حساب المدير — البيانات التالية ناقصة:');
    missing.forEach((item) => console.log(`     ✗ ${item}`));
    console.log(`
  املأ القيم في server/.env ثم أعد التشغيل، أو مرّرها مباشرة:

    npm run db:bootstrap -- \\
      --name="اسمك الكامل" \\
      --email="you@your-domain.com" \\
      --phone="01xxxxxxxxx" \\
      --password='كلمة-مرور-قوية'

  ثم احذف ADMIN_PASSWORD من .env بعد نجاح الإنشاء.
`);
    process.exitCode = 1;
    return;
  }

  if (!EMAIL_RE.test(email)) throw new Error(`بريد غير صالح: ${email}`);
  if (!PHONE_RE.test(phone)) throw new Error(`رقم هاتف مصري غير صالح: ${phone} (الصيغة 01xxxxxxxxx)`);

  const passwordIssues = validatePassword(password);
  if (passwordIssues.length > 0) {
    throw new Error(`كلمة مرور المدير ضعيفة — يجب أن تكون:\n     • ${passwordIssues.join('\n     • ')}`);
  }

  const clash = await queryOne(
    'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
    [email, phone],
  );
  if (clash) throw new Error('البريد أو رقم الهاتف مستخدم بالفعل في حساب آخر');

  await execute(
    `INSERT INTO users (uuid, full_name, email, phone, password_hash, role, status, email_verified_at)
     VALUES (?,?,?,?,?, 'admin', 'active', NOW())`,
    [crypto.randomUUID(), name, email, phone, await hashPassword(password)],
  );

  logger.success(`تم إنشاء حساب المدير: ${email}`);

  console.log(`
  ╭──────────────────────────────────────────────────────────╮
  │  المتجر جاهز للإعداد                                     │
  ├──────────────────────────────────────────────────────────┤
  │  1. شغّل:      npm run dev                                │
  │  2. ادخل من:  /login بحساب المدير                        │
  │  3. ابدأ من:  /admin › الفروع، ثم الأقسام، ثم المنتجات   │
  ├──────────────────────────────────────────────────────────┤
  │  ⚠  احذف ADMIN_PASSWORD من server/.env الآن.             │
  ╰──────────────────────────────────────────────────────────╯
`);
}

bootstrap()
  .catch((error) => {
    logger.error(`فشلت التهيئة: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
