/**
 * ═══════════════════════════════════════════════════════════════
 *  أدوات اللون
 *
 *  لماذا نحتاجها؟ لأن ألوان الأقسام تأتي من قاعدة البيانات ولا نعرف
 *  مسبقًا أيّها فاتح وأيّها داكن. كتابة نصّ أبيض فوق الذهب الشمبانيا
 *  مثلًا تُنتج تباينًا يسقط في اختبار الوصولية.
 *
 *  الحل: نحسب نسبة التباين فعليًا حسب معادلة WCAG ونختار لون النصّ
 *  الذي يحقّق النسبة الأعلى — فيبقى كل قسم بلونه الحيّ ويبقى النصّ
 *  مقروءًا في كل الحالات، مهما أضاف مدير المتجر من ألوان جديدة.
 * ═══════════════════════════════════════════════════════════════
 */

/** حبر الهوية الخمريّ — بديلنا عن الأسود في كل نصّ داكن */
export const INK = '#1D0B15';

/** تحويل #RRGGBB أو #RGB إلى [r, g, b] */
function parseHex(hex) {
  let value = String(hex || '').replace('#', '').trim();
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (value.length !== 6 || /[^0-9a-f]/i.test(value)) return [0, 0, 0];
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

/**
 * السطوع النسبي حسب معادلة WCAG.
 * القناة تُخطّى (gamma) قبل الجمع بأوزان تراعي حساسية العين للأخضر.
 */
export function luminance(hex) {
  const channels = parseHex(hex).map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** نسبة التباين بين لونين (1 = متطابقان، 21 = أبيض فوق أسود) */
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * لون النصّ الأنسب فوق خلفية معيّنة.
 * لا نستخدم عتبة سطوع ثابتة بل نقيس التباين الفعلي مع كل مرشّح
 * ونختار الأعلى — فيعمل الحساب مع أي لون يضيفه مدير المتجر لاحقًا.
 */
export function contrastText(background, { dark = INK, light = '#FFFFFF' } = {}) {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

/** هل يحقّق اللونان معًا الحدّ الأدنى للنصّ العادي (AA = 4.5)؟ */
export const meetsAA = (foreground, background) => contrastRatio(foreground, background) >= 4.5;

/** هل الخلفية فاتحة؟ يفيد لاختيار شفافية الزخارف فوقها */
export const isLight = (background) => luminance(background) > 0.45;

/**
 * تعتيم لون حتى يصلح نصًّا فوق خلفية فاتحة.
 * نخلطه بحبر الهوية تدريجيًا حتى يبلغ تباين AA — فيحتفظ بشخصيته
 * اللونية بدل أن يُستبدل برماديّ ميت.
 */
export function readableOn(color, background = '#FFFFFF') {
  const [r, g, b] = parseHex(color);
  const [ir, ig, ib] = parseHex(INK);
  for (let mix = 0; mix <= 1.001; mix += 0.08) {
    const blended = `#${[
      Math.round(r + (ir - r) * mix),
      Math.round(g + (ig - g) * mix),
      Math.round(b + (ib - b) * mix),
    ].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    if (contrastRatio(blended, background) >= 4.5) return blended;
  }
  return INK;
}
