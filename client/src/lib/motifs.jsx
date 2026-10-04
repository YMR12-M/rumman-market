/**
 * زخارف الأقسام الخطّية — **للاستخدام الإداري فقط** (معاينة المفتاح عند
 * اختيار زخرفة للقسم). واجهة العملاء تستخدم الآن ستيكرات مسطّحة بحدّ
 * حبر من lib/art.jsx؛ المفاتيح واحدة (leaf, cleaver, wave…) فلا يتغيّر
 * شيء في قاعدة البيانات.
 */

import { Fruit } from './art.jsx';

const M = ({ children, ...props }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const MOTIFS = {
  /** الخضار والفاكهة — ورقة وساق */
  leaf: (p) => <M {...p}><path d="M14 50c0-18 12-30 36-33 0 22-11 33-27 33a12 12 0 0 1-9-4Z" /><path d="M20 44c7-8 14-13 22-17" /><path d="M14 50 8 56" /></M>,

  /** اللحوم — ساطور */
  cleaver: (p) => <M {...p}><path d="M12 14h30v22H12z" /><path d="M42 20h10v4H42z" /><path d="M12 36v14" /><path d="M18 22h18M18 28h12" /></M>,

  /** الأسماك — موجة وسمكة */
  wave: (p) => <M {...p}><path d="M8 26c5-6 11-6 16 0s11 6 16 0 11-6 16 0" /><path d="M14 44c6-8 16-10 24-6 4 2 7 5 12 6" /><path d="M40 38c2-2 5-3 8-3l-2 4 2 4c-3 0-6-1-8-3" /><circle cx="30" cy="40" r="1.2" fill="currentColor" /></M>,

  /** الألبان — قطرة داخل زجاجة */
  drop: (p) => <M {...p}><path d="M24 10h16v8l4 6v30H20V24l4-6z" /><path d="M32 30c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11Z" /></M>,

  /** المخبز — سنبلة قمح */
  wheat: (p) => <M {...p}><path d="M32 56V20" /><path d="M32 30c-7 0-11-4-11-9s4-8 11-8 11 3 11 8-4 9-11 9Z" /><path d="M32 42c-7 0-11-4-11-9M32 42c7 0 11-4 11-9" /><path d="M32 52c-6 0-9-3-9-7M32 52c6 0 9-3 9-7" /></M>,

  /** الحلويات — قالب كيك */
  cake: (p) => <M {...p}><path d="M14 32h36v20H14z" /><path d="M14 40c4 4 8 4 12 0s8-4 12 0 8 4 12 0" /><path d="M32 24v-6" /><path d="M32 18c-2-2-1-5 0-6 1 1 2 4 0 6Z" /><path d="M22 32v-6M42 32v-6" /></M>,

  /** البقالة — برطمان */
  jar: (p) => <M {...p}><path d="M20 20h24v32a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" /><path d="M18 12h28v8H18z" /><path d="M26 32h12M26 40h12" /></M>,

  /** الزيوت — غصن زيتون */
  olive: (p) => <M {...p}><path d="M10 54c14 0 26-8 34-22" /><ellipse cx="28" cy="34" rx="5" ry="7" transform="rotate(-35 28 34)" /><ellipse cx="40" cy="22" rx="5" ry="7" transform="rotate(-35 40 22)" /><path d="M46 12c4 4 5 9 3 14" /></M>,

  /** المشروبات — زجاجة */
  bottle: (p) => <M {...p}><path d="M27 8h10v10l5 8v26a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V26l5-8z" /><path d="M22 34h20" /><path d="M28 42h8" /></M>,

  /** القهوة — حبّة بن */
  bean: (p) => <M {...p}><ellipse cx="32" cy="32" rx="14" ry="20" transform="rotate(-32 32 32)" /><path d="M24 44c6-4 8-16 16-24" /></M>,

  /** المجمّدات — ندفة ثلج */
  snow: (p) => <M {...p}><path d="M32 8v48M12 20l40 24M52 20 12 44" /><path d="M32 16l-5 5M32 16l5 5M32 48l-5-5M32 48l5-5" /><path d="m18 25 7 .5M18 25l-.5-7M46 39l-7-.5M46 39l.5 7" /></M>,

  /** الشوكولاتة — لوح */
  cocoa: (p) => <M {...p}><path d="M16 14h32v36H16z" /><path d="M16 26h32M16 38h32M28 14v36M40 14v36" /></M>,

  /** الصحي — برعم ينمو */
  sprout: (p) => <M {...p}><path d="M32 56V28" /><path d="M32 34c-8 0-14-5-14-12 8 0 14 5 14 12Z" /><path d="M32 30c8 0 14-5 14-12-8 0-14 5-14 12Z" /><path d="M22 56h20" /></M>,

  /** الطفل — دبدوب */
  bear: (p) => <M {...p}><circle cx="32" cy="34" r="16" /><circle cx="19" cy="19" r="6" /><circle cx="45" cy="19" r="6" /><circle cx="26" cy="31" r="1.4" fill="currentColor" /><circle cx="38" cy="31" r="1.4" fill="currentColor" /><path d="M32 36v3M28 42c2 2 6 2 8 0" /></M>,

  /** الجمال — زهرة */
  flower: (p) => <M {...p}><circle cx="32" cy="26" r="6" /><path d="M32 20c0-7 4-11 8-9s2 9-8 9ZM32 20c0-7-4-11-8-9s-2 9 8 9Z" /><path d="M38 26c7 0 11 4 9 8s-9 2-9-8ZM26 26c-7 0-11 4-9 8s9 2 9-8Z" /><path d="M32 32v22" /></M>,

  /** المنزل — فقاعات */
  bubble: (p) => <M {...p}><circle cx="26" cy="34" r="14" /><circle cx="45" cy="21" r="7" /><circle cx="47" cy="42" r="5" /><path d="M20 30c1-3 3-5 6-6" /></M>,
};

/**
 * إرجاع مكوّن الزخرفة حسب مفتاح القسم مع بديل آمن.
 * @param {string} key مفتاح motif القادم من قاعدة البيانات
 */
export function getMotif(key) {
  return MOTIFS[key] || MOTIFS.wheat;
}

/**
 * علامة رُمّان: رمّانة بتاج أصفر وثلاث حبّات (من lib/art.jsx).
 * الاسم القديم باقٍ حتى لا تنكسر الاستدعاءات؛ `seedColor` مهمَل لأن
 * الألوان صارت جزءًا من الرسم نفسه.
 */
export const BrandMark = ({ size = 32, seedColor, ...props }) => <Fruit size={size} {...props} />;

/**
 * نمط الحبّات — شبكة نقاط خفيفة تُستخدم كخلفية زخرفية للأقسام الملوّنة.
 * بديل مقصود عن الصور: يضيف ملمسًا بلا ضجيج بصري.
 */
export const SeedPattern = ({ id = 'seeds', color = 'currentColor', opacity = 0.18, ...props }) => (
  <svg aria-hidden="true" {...props}>
    <defs>
      <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <circle cx="4" cy="4" r="2.1" fill={color} opacity={opacity} />
        <circle cx="15" cy="14" r="1.4" fill={color} opacity={opacity * 0.7} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);
