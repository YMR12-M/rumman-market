/**
 * ثوابت قواعد العمل — مرجع واحد تستورد منه كل الموديولات.
 * تغيير أي قاعدة هنا ينعكس على النظام كله بلا بحث في الملفات.
 */

/** الأدوار مرتّبة تصاعديًا حسب الصلاحية */
export const ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  BRANCH_MANAGER: 'branch_manager',
  ADMIN: 'admin',
};

export const ROLE_RANK = {
  [ROLES.CUSTOMER]: 1,
  [ROLES.STAFF]: 2,
  [ROLES.BRANCH_MANAGER]: 3,
  [ROLES.ADMIN]: 4,
};

/** حالات الطلب والانتقالات المسموحة بينها (آلة حالة صريحة) */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** الحالات التي يحق للعميل فيها إلغاء طلبه بنفسه */
export const CUSTOMER_CANCELLABLE = ['pending', 'confirmed'];

/** فئات الولاء وحدودها بإجمالي الإنفاق */
export const LOYALTY_TIERS = [
  { key: 'silver',   label: 'فضّي',    minSpent: 0,     multiplier: 1,   perks: ['نقطة لكل جنيه', 'عروض الأعضاء'] },
  { key: 'gold',     label: 'ذهبي',    minSpent: 15000, multiplier: 1.5, perks: ['نقطة ونصف لكل جنيه', 'توصيل مجاني فوق 500', 'أولوية في مواعيد التوصيل'] },
  { key: 'platinum', label: 'بلاتيني', minSpent: 50000, multiplier: 2,   perks: ['نقطتان لكل جنيه', 'توصيل مجاني دائمًا', 'مدير حساب شخصي', 'دعوات لتذوّق المنتجات الجديدة'] },
];

/** مواعيد التوصيل المتاحة يوميًا */
export const DELIVERY_SLOTS = [
  { from: '09:00', to: '12:00', label: 'صباحًا' },
  { from: '12:00', to: '15:00', label: 'ظهرًا' },
  { from: '15:00', to: '18:00', label: 'عصرًا' },
  { from: '18:00', to: '21:00', label: 'مساءً' },
  { from: '21:00', to: '23:59', label: 'ليلًا' },
];

/** حدود الترقيم الافتراضية لكل استعلامات القوائم */
export const PAGINATION = { defaultLimit: 24, maxLimit: 100 };

/** أعمدة الترتيب المسموحة — قائمة بيضاء تمنع حقن SQL عبر معامل sort */
export const PRODUCT_SORTS = {
  featured:   'p.is_featured DESC, p.sold_count DESC',
  newest:     'p.created_at DESC, p.id DESC',
  price_asc:  'effective_price ASC',
  price_desc: 'effective_price DESC',
  rating:     'p.rating_avg DESC, p.rating_count DESC',
  popular:    'p.sold_count DESC',
  name:       'p.name_ar ASC',
};
