/**
 * تعامل آمن مع النقود.
 * القاعدة: نحسب بالقروش (أعداد صحيحة) ثم نُخرج جنيهات بخانتين عشريتين،
 * لتجنّب أخطاء الفاصلة العائمة مثل 0.1 + 0.2 = 0.30000000000000004
 */

/** تقريب مبلغ إلى خانتين عشريتين بأمان */
export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** جمع قائمة مبالغ */
export const sum = (values) => round2(values.reduce((acc, v) => acc + Number(v || 0), 0));

/** نسبة مئوية من مبلغ */
export const percentOf = (amount, percent) => round2((Number(amount) * Number(percent)) / 100);
