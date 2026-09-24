/**
 * ═══════════════════════════════════════════════════════════════
 *  تحميل متغيّرات البيئة والتحقّق منها في مكان واحد.
 *
 *  فلسفة هذا الملف: **الفشل مبكرًا وبصوت عالٍ**. أي إعداد ناقص أو
 *  خطير يوقف الخادم عند الإقلاع برسالة عربية واضحة، بدل أن يتحوّل
 *  إلى خطأ غامض بعد أسبوع من العمل في الإنتاج.
 *
 *  وفي الإنتاج تحديدًا نرفض الأسرار الافتراضية والقصيرة — لأن أسوأ
 *  ثغرة أمنية هي تلك التي نسي أحدٌ تغييرها.
 * ═══════════════════════════════════════════════════════════════
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

/** أخطاء الإعداد تُجمَّع كلها ثم تُعرض دفعةً واحدة */
const problems = [];

const read = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

/** متغيّر مطلوب دائمًا */
function required(key, fallback) {
  const value = read(key, fallback);
  if (value === undefined || value === '') problems.push(`${key} مفقود`);
  return value;
}

/** متغيّر مطلوب في الإنتاج فقط */
function requiredInProd(key, { fallback, hint } = {}) {
  const value = read(key, fallback);
  if (isProd && (value === undefined || value === '')) {
    problems.push(`${key} مطلوب في الإنتاج${hint ? ` — ${hint}` : ''}`);
  }
  return value;
}

/** سرٌّ لا يُقبل افتراضيًا ولا قصيرًا في الإنتاج */
function secret(key, devFallback) {
  const value = read(key, isProd ? undefined : devFallback);
  if (!isProd) return value;

  if (!value) {
    problems.push(`${key} مفقود — ولّده بـ:  openssl rand -base64 48`);
  } else if (value.length < 32) {
    problems.push(`${key} قصير جدًا (${value.length} حرفًا) — الحدّ الأدنى 32`);
  } else if (/change-?me|secret-please|placeholder|example/i.test(value)) {
    problems.push(`${key} ما زال بالقيمة الافتراضية — غيّره قبل النشر`);
  }
  return value;
}

const bool = (key, fallback = false) => {
  const value = read(key);
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const num = (key, fallback) => {
  const value = read(key);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    problems.push(`${key} يجب أن يكون رقمًا (القيمة الحالية: ${value})`);
    return fallback;
  }
  return parsed;
};

const list = (key, fallback = '') =>
  String(read(key, fallback)).split(',').map((item) => item.trim()).filter(Boolean);

/* ═══════════════════════════════════════════════════════════════ */

const clientOrigin = list('CLIENT_ORIGIN', 'http://localhost:5173');
if (isProd && clientOrigin.some((origin) => origin.includes('localhost') || origin === '*')) {
  problems.push('CLIENT_ORIGIN يحتوي localhost أو * — اضبطه على نطاقك فقط في الإنتاج');
}

const appUrl = read('APP_URL', clientOrigin[0] || 'http://localhost:5173');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: num('PORT', 4000),
  apiPrefix: read('API_PREFIX', '/api/v1'),
  clientOrigin,
  appUrl,
  /** عنوان الـ API كما يراه العالم — تحتاجه بوابات الدفع لإرسال الـ webhook */
  apiPublicUrl: requiredInProd('API_PUBLIC_URL', {
    fallback: `http://localhost:${num('PORT', 4000)}`,
    hint: 'العنوان العام للـ API حتى تصل استدعاءات بوابات الدفع',
  }),

  db: {
    host: required('DB_HOST', '127.0.0.1'),
    port: num('DB_PORT', 3306),
    user: required('DB_USER', 'root'),
    password: read('DB_PASSWORD', ''),
    database: required('DB_NAME', 'rumman_market'),
    connectionLimit: num('DB_CONNECTION_LIMIT', 10),
    ssl: bool('DB_SSL', false),
  },

  jwt: {
    accessSecret: secret('JWT_ACCESS_SECRET', 'dev-only-access-secret-not-for-production'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-not-for-production'),
    accessTtl: read('JWT_ACCESS_TTL', '30m'),
    refreshTtl: read('JWT_REFRESH_TTL', '30d'),
  },

  /** العلامة — تظهر في البريد والفواتير ورسائل النظام */
  brand: {
    name: read('BRAND_NAME', 'رُمّان'),
    tagline: read('BRAND_TAGLINE', 'مائدة تستحقّ الأفضل'),
    supportPhone: read('SUPPORT_PHONE', ''),
    supportEmail: read('SUPPORT_EMAIL', ''),
  },

  mail: {
    apiKey: requiredInProd('RESEND_API_KEY', { hint: 'مفتاح Resend لإرسال بريد التفعيل والطلبات' }),
    from: read('MAIL_FROM', 'رُمّان <onboarding@resend.dev>'),
    replyTo: read('MAIL_REPLY_TO', ''),
  },

  payments: {
    /** الدفع عند الاستلام — لا يحتاج إعدادًا */
    cod: { enabled: bool('PAY_COD_ENABLED', true) },

    /**
     * إنستاباي: تحويل يدوي يراجعه الفريق.
     * لا توجد واجهة برمجية للتجّار في إنستاباي، فالتدفّق الحقيقي هو
     * أن يحوّل العميل إلى عنواننا ويرفع صورة الإيصال، ثم يعتمده الفريق
     * من لوحة الإدارة. كل شيء مسجَّل ومدقَّق.
     */
    instapay: {
      enabled: bool('PAY_INSTAPAY_ENABLED', false),
      address: read('INSTAPAY_ADDRESS', ''),
      accountName: read('INSTAPAY_ACCOUNT_NAME', ''),
      /** مهلة رفع الإيصال قبل إلغاء الطلب تلقائيًا (بالساعات) */
      proofWindowHours: num('INSTAPAY_PROOF_WINDOW_HOURS', 24),
    },

    /** فوري: تكامل فعلي عبر FawryPay */
    fawry: {
      enabled: bool('PAY_FAWRY_ENABLED', false),
      merchantCode: read('FAWRY_MERCHANT_CODE', ''),
      securityKey: read('FAWRY_SECURITY_KEY', ''),
      baseUrl: read('FAWRY_BASE_URL', 'https://atfawry.fawrystaging.com'),
      /** صلاحية كود الدفع بالساعات */
      expiryHours: num('FAWRY_EXPIRY_HOURS', 24),
    },
  },

  uploads: {
    /** الحدّ الأقصى لحجم صورة المنتج أو إيصال التحويل (بالميجابايت) */
    maxFileMb: num('UPLOAD_MAX_FILE_MB', 5),
    /** عنوان عام للملفات — يتغيّر إذا قدّمتها عبر CDN */
    publicUrl: read('UPLOADS_PUBLIC_URL', ''),
  },

  business: {
    pointsPerEgp: num('POINTS_PER_EGP', 1),
    pointValueEgp: num('POINT_VALUE_EGP', 0.05),
    defaultTaxRate: num('DEFAULT_TAX_RATE', 0),
    /** أقصى نسبة من قيمة السلة يمكن دفعها بالنقاط */
    maxPointsRedemptionPercent: num('MAX_POINTS_REDEMPTION_PERCENT', 50),
  },
};

/* ── تحقّقات تقاطعية: إعداد ناقص يجعل ميزةً كاملة تكذب على العميل ── */

if (env.payments.instapay.enabled && !env.payments.instapay.address) {
  problems.push('PAY_INSTAPAY_ENABLED مفعّل لكن INSTAPAY_ADDRESS فارغ — العميل لن يعرف أين يحوّل');
}

if (env.payments.fawry.enabled && (!env.payments.fawry.merchantCode || !env.payments.fawry.securityKey)) {
  problems.push('PAY_FAWRY_ENABLED مفعّل لكن FAWRY_MERCHANT_CODE أو FAWRY_SECURITY_KEY فارغ');
}

if (isProd && env.payments.fawry.enabled && env.payments.fawry.baseUrl.includes('staging')) {
  problems.push('FAWRY_BASE_URL ما زال على بيئة الاختبار (staging) بينما NODE_ENV=production');
}

if (isProd && !env.brand.supportEmail) {
  problems.push('SUPPORT_EMAIL مطلوب في الإنتاج — يظهر في كل رسالة بريد');
}

if (problems.length > 0) {
  const lines = problems.map((problem) => `   ✗ ${problem}`).join('\n');
  throw new Error(
    `\n\n  ✖ إعدادات البيئة غير مكتملة (server/.env)\n\n${lines}\n\n`
    + '  راجع server/.env.example — كل متغيّر موثّق فيه.\n',
  );
}
