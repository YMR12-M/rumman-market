/**
 * أدوات صغيرة تخصّ الجهاز: الحافظة، والتمرير الأفقي، واتجاه الكتابة.
 */

/**
 * نسخ نصّ إلى الحافظة. يرجع true عند النجاح.
 * الحافظة تحتاج أصلًا آمنًا وإذنًا من المتصفّح، فقد تُرفض — والمستدعي
 * يعرض عندها «انسخه يدويًا» بدل أن يدّعي نجاحًا لم يحدث.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

/**
 * إظهار عنصر داخل حاوية تمرير أفقية دون لمس التمرير العمودي للصفحة.
 *
 * `scrollIntoView` لا يصلح هنا: كل قيمة يقبلها تمرّر أقرب حاوية على
 * المحورين معًا، فاستدعاؤه على شريط رقائق أسفل الشاشة يقفز بالصفحة
 * كلّها إليه. هذه الدالة تكتب `scrollLeft` وحده، وبفارقٍ نسبيّ يعمل
 * كما هو في الاتجاه من اليمين إلى اليسار.
 */
export function scrollChildIntoViewX(container, child) {
  if (!container || !child) return;

  const bounds = container.getBoundingClientRect();
  const target = child.getBoundingClientRect();
  if (target.left >= bounds.left && target.right <= bounds.right) return;

  container.scrollLeft += target.left - bounds.left - (bounds.width - target.width) / 2;
}

/** هل الوثيقة من اليمين إلى اليسار؟ يحدّد اتجاه إيماءة السحب للحذف. */
export const isRtl = () => (document.documentElement.dir || 'rtl') === 'rtl';
