/**
 * خيارات الترتيب والتصفية — مكان واحد تقرأ منه شاشة المنتجات وورقتا
 * الترتيب والتصفية. القيم نفسها التي يفهمها الخادم في `/products`.
 */

export const SORTS = [
  ['featured', 'المختارات أولًا'],
  ['popular', 'الأكثر طلبًا'],
  ['newest', 'الأحدث'],
  ['price_asc', 'السعر: من الأقل'],
  ['price_desc', 'السعر: من الأعلى'],
  ['rating', 'الأعلى تقييمًا'],
  ['name', 'أبجديًا'],
];

/** مفاتيح منطقية تُحفظ في الرابط كـ true */
export const TOGGLES = [
  ['on_sale', 'عليه خصم'],
  ['in_stock', 'متوفّر الآن'],
  ['organic', 'عضوي معتمد'],
  ['exclusive', 'حصري في رُمّان'],
  ['featured', 'من مختاراتنا'],
];

/** شرائح السعر بالجنيه — حدود بحث لا ادّعاءات عن المتجر */
export const PRICE_BANDS = [
  ['0-50', 'أقل من 50'],
  ['50-150', '50 — 150'],
  ['150-400', '150 — 400'],
  ['400-1000', '400 — 1000'],
  ['1000-', 'أكثر من 1000'],
];

export const RATINGS = [4.5, 4, 3.5];

/** تحويل شريحة السعر من الرابط إلى حدّين للـ API */
export function priceBounds(band) {
  if (!band) return [undefined, undefined];
  const [min, max] = band.split('-');
  return [min ? Number(min) : undefined, max ? Number(max) : undefined];
}
