/**
 * ═══════════════════════════════════════════════════════════════
 *  مخططات التحقّق لكل ما تكتبه لوحة الإدارة
 *
 *  رسائل الخطأ عربية ومحدّدة الحقل، لأن من يستخدم هذه اللوحة هو
 *  مدير المتجر لا مطوّر — و«Invalid input» لا تساعده في شيء.
 *
 *  ملاحظة على النمط: لكل كيان مخطّط `create` صريح، و`update` مبنيّ
 *  منه بـ `.partial()` — فلا يمكن أن يتباعد المخططان مع الوقت.
 * ═══════════════════════════════════════════════════════════════
 */
import { z } from 'zod';

/* ── أدوات مشتركة ─────────────────────────────────────────────── */

const text = (min, max, label) => z.string({ required_error: `${label} مطلوب` })
  .trim().min(min, `${label} قصير جدًا`).max(max, `${label} أطول من ${max} حرفًا`);

const optionalText = (max) => z.string().trim().max(max).optional().nullable()
  .transform((value) => (value === '' ? null : value));

/** المُعرِّف النصّي في الرابط: حروف لاتينية صغيرة وأرقام وشرطات */
const slug = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'المُعرِّف يقبل الحروف اللاتينية الصغيرة والأرقام والشرطة فقط')
  .min(2, 'المُعرِّف قصير جدًا').max(90);

const hexColor = z.string().trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'اللون بصيغة ست عشرية مثل #D81E4A');

const money = z.coerce.number({ invalid_type_error: 'أدخل رقمًا' })
  .min(0, 'المبلغ لا يكون سالبًا').max(9_999_999, 'المبلغ كبير جدًا');

const egyptPhone = z.string().trim().regex(/^01[0125][0-9]{8}$/, 'رقم موبايل مصري غير صحيح (01xxxxxxxxx)');

/** التوقيت بصيغة HH:MM أو HH:MM:SS — MySQL يقبل الاثنين */
const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'الوقت بصيغة 14:30');

const isoDateTime = z.string().trim().min(1, 'التاريخ مطلوب');

const bool = z.union([z.boolean(), z.literal('true'), z.literal('false'), z.literal(0), z.literal(1), z.literal('0'), z.literal('1')])
  .transform((value) => value === true || value === 'true' || value === 1 || value === '1');

export const idParam = z.object({ id: z.coerce.number().int().positive('مُعرِّف غير صالح') });

/* ═══ الفروع ══════════════════════════════════════════════════════ */

export const branchCreate = z.object({
  code: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, 'كود الفرع: حروف لاتينية كبيرة وأرقام، 2 إلى 12 خانة')
    .describe('يظهر داخل رقم كل طلب — اخْتَره مختصرًا ومميّزًا'),
  slug,
  name_ar: text(2, 120, 'اسم الفرع بالعربية'),
  name_en: text(2, 120, 'اسم الفرع بالإنجليزية'),
  tagline_ar: optionalText(180),
  address_ar: text(5, 255, 'العنوان بالعربية'),
  address_en: text(5, 255, 'العنوان بالإنجليزية'),
  city: text(2, 80, 'المدينة'),
  governorate: text(2, 80, 'المحافظة'),
  latitude: z.coerce.number().min(-90, 'خط عرض غير صالح').max(90, 'خط عرض غير صالح'),
  longitude: z.coerce.number().min(-180, 'خط طول غير صالح').max(180, 'خط طول غير صالح'),
  phone: z.string().trim().min(5, 'رقم الفرع مطلوب').max(20),
  whatsapp: optionalText(20),
  email: z.string().trim().email('بريد غير صالح').max(160).optional().nullable()
    .transform((value) => (value === '' ? null : value)),
  opens_at: time.default('08:00'),
  closes_at: time.default('23:59'),
  is_24h: bool.default(false),
  delivery_radius_km: z.coerce.number().min(0.5, 'النطاق لا يقلّ عن نصف كيلومتر').max(200).default(10),
  delivery_fee: money.default(0),
  free_delivery_over: money.default(0),
  min_order_amount: money.default(0),
  avg_prep_minutes: z.coerce.number().int().min(5, 'أقلّ من 5 دقائق غير واقعي').max(600).default(45),
  supports_pickup: bool.default(true),
  area_sqm: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  opened_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  manager_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'maintenance', 'closed']).default('active'),
});

export const branchUpdate = branchCreate.partial();

export const branchHours = z.object({
  hours: z.array(z.object({
    weekday: z.coerce.number().int().min(0, 'اليوم من 0 (الأحد) إلى 6 (السبت)').max(6),
    open_time: time,
    close_time: time,
    is_closed: bool.default(false),
  })).max(7, 'سبعة أيام كحدّ أقصى'),
});

export const zoneCreate = z.object({
  name_ar: text(2, 120, 'اسم المنطقة بالعربية'),
  name_en: text(2, 120, 'اسم المنطقة بالإنجليزية'),
  delivery_fee: money.default(0),
  min_order: money.default(0),
  eta_minutes: z.coerce.number().int().min(5).max(1440).default(60),
  status: z.enum(['active', 'paused']).default('active'),
});

export const zoneUpdate = zoneCreate.partial();

/* ═══ الأقسام ═════════════════════════════════════════════════════ */

/** مفاتيح الزخارف المتاحة في الواجهة — قائمة بيضاء تمنع قيمًا لا تُرسَم */
export const MOTIF_KEYS = [
  'leaf', 'cleaver', 'wave', 'drop', 'wheat', 'cake', 'jar', 'olive',
  'bean', 'bottle', 'snack', 'freeze', 'sparkle', 'baby', 'paw', 'sprout',
];

export const categoryCreate = z.object({
  parent_id: z.coerce.number().int().positive().optional().nullable(),
  slug,
  name_ar: text(2, 120, 'اسم القسم بالعربية'),
  name_en: text(2, 120, 'اسم القسم بالإنجليزية'),
  tagline_ar: optionalText(180),
  description_ar: optionalText(2000),
  motif: z.enum(MOTIF_KEYS, { errorMap: () => ({ message: 'اختر زخرفة من القائمة' }) }).default('wheat'),
  accent_color: hexColor.default('#D81E4A'),
  aisle_code: optionalText(10),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_featured: bool.default(false),
  status: z.enum(['active', 'hidden']).default('active'),
});

export const categoryUpdate = categoryCreate.partial();

export const reorderPayload = z.object({
  order: z.array(z.object({
    id: z.coerce.number().int().positive(),
    sort_order: z.coerce.number().int().min(0).max(9999),
  })).min(1, 'أرسل عنصرًا واحدًا على الأقل'),
});

/* ═══ العلامات التجارية ═══════════════════════════════════════════ */

export const brandCreate = z.object({
  slug,
  name_ar: text(2, 120, 'اسم العلامة بالعربية'),
  name_en: text(2, 120, 'اسم العلامة بالإنجليزية'),
  country: optionalText(60),
  is_house_label: bool.default(false),
  status: z.enum(['active', 'hidden']).default('active'),
});

export const brandUpdate = brandCreate.partial();

/* ═══ المنتجات ════════════════════════════════════════════════════ */

const UNITS = ['kg', 'gram', 'piece', 'pack', 'bundle', 'liter', 'ml', 'dozen'];

/**
 * شكل المنتج مفصولٌ عن قيوده المركّبة عمدًا:
 * `create` يطبّق الشكل + القيود، و`update` يطبّق الشكل جزئيًا + نفس
 * القيود. لو دمجناهما لاحتجنا نقب Zod الداخلي لاستخراج الشكل — وهو
 * تفصيل تنفيذي يتغيّر بين الإصدارات.
 */
const productShape = {
  sku: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, 'كود المنتج: حروف لاتينية كبيرة وأرقام وشرطات')
    .max(40),
  slug: slug.max(160),
  barcode: optionalText(32),
  category_id: z.coerce.number().int().positive('اختر القسم'),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  name_ar: text(2, 180, 'اسم المنتج بالعربية'),
  name_en: text(2, 180, 'اسم المنتج بالإنجليزية'),
  short_desc_ar: optionalText(255),
  description_ar: optionalText(5000),
  unit: z.enum(UNITS, { errorMap: () => ({ message: 'اختر وحدة القياس' }) }).default('piece'),
  unit_size: optionalText(40),
  price: money.refine((value) => value > 0, 'السعر يجب أن يكون أكبر من صفر'),
  compare_at_price: money.optional().nullable(),
  cost_price: money.optional().nullable(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  origin_country: optionalText(60),
  farm_or_maker: optionalText(120),
  storage_ar: optionalText(180),
  shelf_life_days: z.coerce.number().int().min(0).max(3650).optional().nullable(),
  nutrition: z.record(z.union([z.string(), z.number()])).optional().nullable(),
  allergens: z.array(z.string().trim().max(60)).max(30).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(30).optional().nullable(),
  is_organic: bool.default(false),
  is_fresh: bool.default(false),
  is_exclusive: bool.default(false),
  is_featured: bool.default(false),
  badge: z.enum(['none', 'new', 'best_seller', 'limited', 'deal']).default('none'),
  max_per_order: z.coerce.number().int().min(1, 'الحدّ الأدنى قطعة واحدة').max(999).default(20),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
};

/** السعر المشطوب يجب أن يكون أعلى فعلًا، وإلا كان «خصمًا» كاذبًا */
const comparePriceRule = [
  (data) => !data.compare_at_price || !data.price || data.compare_at_price > data.price,
  { message: 'السعر قبل الخصم يجب أن يكون أعلى من السعر الحالي', path: ['compare_at_price'] },
];

export const productCreate = z.object(productShape).refine(...comparePriceRule);
export const productUpdate = z.object(productShape).partial().refine(...comparePriceRule);

export const adminProductQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/* ═══ المخزون ═════════════════════════════════════════════════════ */

export const inventoryUpsert = z.object({
  branch_id: z.coerce.number().int().positive('اختر الفرع'),
  product_id: z.coerce.number().int().positive('اختر المنتج'),
  quantity: z.coerce.number().int().min(0, 'الكمية لا تكون سالبة').max(1_000_000),
  low_stock_threshold: z.coerce.number().int().min(0).max(100_000).default(10),
  aisle: optionalText(20),
  price_override: money.optional().nullable(),
  restock_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ بصيغة 2026-01-31').optional().nullable()
    .transform((value) => (value === '' ? null : value)),
  note: optionalText(255),
});

export const stockAdjust = z.object({
  branch_id: z.coerce.number().int().positive(),
  product_id: z.coerce.number().int().positive(),
  delta: z.coerce.number().int().refine((value) => value !== 0, 'أدخل قيمة غير صفرية'),
  type: z.enum(['restock', 'adjustment', 'damage', 'return']).default('adjustment'),
  note: optionalText(255),
});

/** نشر منتج على عدّة فروع دفعةً واحدة */
export const bulkStock = z.object({
  product_id: z.coerce.number().int().positive(),
  branches: z.array(z.object({
    branch_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    low_stock_threshold: z.coerce.number().int().min(0).max(100_000).optional(),
    price_override: money.optional().nullable(),
    aisle: optionalText(20),
  })).min(1, 'اختر فرعًا واحدًا على الأقل'),
});

/* ═══ الكوبونات ═══════════════════════════════════════════════════ */

const couponShape = {
  code: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/, 'كود الخصم: حروف لاتينية كبيرة وأرقام، 3 خانات على الأقل')
    .max(40),
  title_ar: text(2, 160, 'وصف الكوبون'),
  type: z.enum(['percentage', 'fixed', 'free_delivery'], { errorMap: () => ({ message: 'اختر نوع الخصم' }) }),
  value: z.coerce.number().min(0).max(1_000_000).default(0),
  min_order_amount: money.default(0),
  max_discount: money.optional().nullable(),
  applies_to: z.enum(['all', 'category', 'product']).default('all'),
  applies_value: z.coerce.number().int().positive().optional().nullable(),
  first_order_only: bool.default(false),
  usage_limit: z.coerce.number().int().min(1).max(10_000_000).optional().nullable(),
  per_user_limit: z.coerce.number().int().min(1).max(1000).default(1),
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  status: z.enum(['active', 'paused', 'expired']).default('active'),
};

/**
 * قيود الكوبون المركّبة.
 * كلّها مكتوبة لتتجاوز الحقول الغائبة، فتصلح للتعديل الجزئي أيضًا:
 * تعديلُ العنوان وحده لا يجب أن يسأل عن تاريخ الانتهاء.
 */
const couponRules = (schema) => schema
  .refine((d) => !d.starts_at || !d.ends_at || new Date(d.ends_at) > new Date(d.starts_at), {
    message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية', path: ['ends_at'],
  })
  .refine((d) => d.type !== 'percentage' || (d.value > 0 && d.value <= 100), {
    message: 'نسبة الخصم بين 1 و100', path: ['value'],
  })
  .refine((d) => d.type !== 'fixed' || d.value > 0, {
    message: 'أدخل مبلغ الخصم', path: ['value'],
  })
  .refine((d) => !d.applies_to || d.applies_to === 'all' || Boolean(d.applies_value), {
    message: 'اختر القسم أو المنتج الذي ينطبق عليه الكوبون', path: ['applies_value'],
  });

export const couponCreate = couponRules(z.object(couponShape));
export const couponUpdate = couponRules(z.object(couponShape).partial());

/* ═══ العروض التحريرية ════════════════════════════════════════════ */

const promotionShape = {
  slug,
  title_ar: text(2, 160, 'عنوان العرض'),
  subtitle_ar: optionalText(255),
  kind: z.enum(['hero', 'strip', 'category_spotlight', 'flash']).default('strip'),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  cta_label: optionalText(60),
  cta_href: optionalText(160),
  accent: hexColor.default('#D81E4A'),
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(['active', 'hidden']).default('active'),
};

const promotionWindowRule = [
  (d) => !d.starts_at || !d.ends_at || new Date(d.ends_at) > new Date(d.starts_at),
  { message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية', path: ['ends_at'] },
];

export const promotionCreate = z.object(promotionShape).refine(...promotionWindowRule);
export const promotionUpdate = z.object(promotionShape).partial().refine(...promotionWindowRule);

/* ═══ المستخدمون والفريق ══════════════════════════════════════════ */

export const staffCreate = z.object({
  full_name: text(3, 160, 'الاسم الكامل'),
  email: z.string().trim().toLowerCase().email('بريد غير صالح').max(160),
  phone: egyptPhone,
  password: z.string().min(10, 'كلمة المرور 10 أحرف على الأقل').max(128),
  role: z.enum(['staff', 'branch_manager', 'admin'], { errorMap: () => ({ message: 'اختر الدور' }) }),
  default_branch_id: z.coerce.number().int().positive().optional().nullable(),
}).refine((data) => data.role === 'admin' || Boolean(data.default_branch_id), {
  message: 'موظّف الفرع ومديره يحتاجان تحديد الفرع', path: ['default_branch_id'],
});

export const userUpdate = z.object({
  full_name: text(3, 160, 'الاسم الكامل').optional(),
  role: z.enum(['customer', 'staff', 'branch_manager', 'admin']).optional(),
  default_branch_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'suspended']).optional(),
});

export const adminUserQuery = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'staff', 'branch_manager', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/* ═══ الطلبات في اللوحة ═══════════════════════════════════════════ */

export const adminOrderQuery = z.object({
  q: z.string().trim().max(120).optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']).optional(),
  payment_status: z.enum(['unpaid', 'awaiting_payment', 'under_review', 'paid', 'failed', 'refunded']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/* ═══ الإعدادات ═══════════════════════════════════════════════════ */

export const settingsUpdate = z.object({
  settings: z.array(z.object({
    key: z.string().trim().min(1).max(80),
    value: z.string().max(4000),
    group: z.string().trim().max(40).default('general'),
  })).min(1, 'أرسل إعدادًا واحدًا على الأقل'),
});

/* ═══ استيراد المنتجات من CSV ═════════════════════════════════════ */

export const importPayload = z.object({
  /** نصّ CSV كما هو — نحلّله في الخدمة لنعطي أخطاءً مرقّمة بالسطر */
  csv: z.string().min(10, 'الملف فارغ'),
  /** التطبيق الفعلي أم معاينة فقط */
  commit: bool.default(false),
  /** الفرع الذي يُسجَّل فيه المخزون الابتدائي (اختياري) */
  branch_id: z.coerce.number().int().positive().optional().nullable(),
});
