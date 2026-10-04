/**
 * أدوات التنسيق — مكان واحد لكل ما يُعرض للمستخدم من أرقام وتواريخ.
 * قاعدة البراند: الأرقام بالصيغة الغربية (1,234) والعملة «ج.م» بعد الرقم.
 */

const numberFormatter = new Intl.NumberFormat('ar-EG-u-nu-latn', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** مبلغ بالجنيه: 1,234.5 ج.م */
export const money = (value) => `${numberFormatter.format(Number(value || 0))} ج.م`;

/** رقم مجرّد بفواصل الآلاف */
export const num = (value) => numberFormatter.format(Number(value || 0));

/** نسبة مئوية */
export const percent = (value) => `${numberFormatter.format(Number(value || 0))}%`;

const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric', month: 'long', year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '—');
export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : '—');

/** وقت نسبي: «قبل 3 ساعات» */
export function timeAgo(value) {
  if (!value) return '—';
  const diffSeconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  const units = [
    [60, 'ثانية', 1],
    [3600, 'دقيقة', 60],
    [86400, 'ساعة', 3600],
    [604800, 'يوم', 86400],
    [2592000, 'أسبوع', 604800],
    [31536000, 'شهر', 2592000],
  ];
  for (const [limit, label, divisor] of units) {
    if (diffSeconds < limit) {
      const amount = Math.max(1, Math.floor(diffSeconds / divisor));
      return `قبل ${amount} ${label}`;
    }
  }
  return formatDate(value);
}

/** الوحدة بالعربية كما تُعرض تحت السعر */
export const UNIT_LABELS = {
  kg: 'كجم', gram: 'جم', piece: 'قطعة', pack: 'عبوة',
  bundle: 'باقة', liter: 'لتر', ml: 'مل', dozen: 'دستة',
};
export const unitLabel = (unit) => UNIT_LABELS[unit] || '';

/** حالات الطلب بالعربية + الفئة اللونية المستخدمة في CSS */
export const ORDER_STATUS_META = {
  pending:          { label: 'قيد المراجعة',   tone: 'pending' },
  confirmed:        { label: 'تم التأكيد',     tone: 'active' },
  preparing:        { label: 'جارٍ التجهيز',   tone: 'active' },
  ready:            { label: 'جاهز',           tone: 'active' },
  out_for_delivery: { label: 'في الطريق إليك', tone: 'active' },
  delivered:        { label: 'تم التسليم',     tone: 'done' },
  cancelled:        { label: 'ملغي',           tone: 'cancel' },
  refunded:         { label: 'مسترد',          tone: 'cancel' },
};

/** ترتيب مراحل الطلب لرسم الخط الزمني */
export const ORDER_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

/** وسائل الدفع المدعومة فعليًا */
export const PAYMENT_LABELS = {
  cod: 'الدفع عند الاستلام',
  instapay: 'إنستاباي',
  fawry: 'فوري',
  wallet: 'محفظة رُمّان',
};
export const paymentLabel = (method) => PAYMENT_LABELS[method] ?? method;

/**
 * حالة الدفع كما يفهمها العميل.
 * `tone` يحدّد الفئة اللونية، و`actionable` يقول إن كانت الكرة في
 * ملعب العميل — فترسم الواجهة له ما يفعله بدل إخباره بحالة جامدة.
 */
export const PAYMENT_STATUS_META = {
  unpaid:           { label: 'يُدفع عند الاستلام', tone: 'pending', actionable: false },
  awaiting_payment: { label: 'بانتظار الدفع',      tone: 'warn',    actionable: true },
  under_review:     { label: 'نراجع التحويل',      tone: 'active',  actionable: false },
  paid:             { label: 'مدفوع',              tone: 'done',    actionable: false },
  failed:           { label: 'فشل الدفع',          tone: 'cancel',  actionable: true },
  refunded:         { label: 'مسترد',              tone: 'cancel',  actionable: false },
};

/** ترجمة وسوم المنتج إلى عربية معروضة للمستخدم */
export const TAG_LABELS = {
  organic: 'عضوي معتمد',
  fresh: 'طازج يوميًا',
  exclusive: 'حصري في رُمّان',
  featured: 'من مختاراتنا',
  new: 'وصل حديثًا',
  best: 'الأكثر طلبًا',
  limited: 'كمية محدودة',
  deal: 'عليه خصم',
};
export const tagLabel = (tag) => TAG_LABELS[tag] ?? tag;

/** الحرف الأول من اسم المنتج — يُستخدم في لوحة المنتج */
export const initial = (text = '') => String(text).trim().charAt(0) || 'ن';
