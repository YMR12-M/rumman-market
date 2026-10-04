import { useMemo } from 'react';
import { getItemArt } from '@/lib/art-items.jsx';

/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة المنتج — ورقة ملوّنة عليها ملصق المنتج
 *
 *  إن وُجدت صورة حقيقية للمنتج عُرضت بكامل اللوحة. وإن لم توجد (وهو
 *  الغالب حتى يرفع المدير صورًا) رُسم ملصق القسم مقصوصًا بإطار عاجي
 *  فوق ورقة بلون القسم.
 *
 *  مشكلة كانت واردة: خمسة منتجات في قسم واحد تتشابه لوحاتها. الحل:
 *  نشتق من اسم المنتج نفسه **نمط الخلفية** (نقاط/خطوط/مربّعات/شمس)
 *  و**ميلًا وإزاحة** ثابتَين — فتختلف كل لوحة عن جارتها وتبقى النتيجة
 *  ثابتة في كل تحميل.
 * ═══════════════════════════════════════════════════════════════
 */

/** بصمة رقمية بسيطة من النص — نفس الاسم يعطي نفس الرقم دائمًا */
function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

const PATTERNS = ['dots', 'stripes', 'grid', 'sun'];

export default function ProductPlate({
  name = '',
  motif = 'leaf',
  accent = '#D5233F',
  image = null,
  compact = false,
}) {
  const Art = getItemArt(name, motif);

  const variant = useMemo(() => {
    const seed = hash(name || motif);
    return {
      pattern: PATTERNS[seed % PATTERNS.length],
      rotate: ((seed >> 3) % 13) - 6,           // من -6 إلى +6 درجة
      scale: 0.94 + ((seed >> 7) % 13) / 100,   // من 0.94 إلى 1.06
      shift: ((seed >> 11) % 9) - 4,            // إزاحة أفقية خفيفة %
    };
  }, [name, motif]);

  if (image) {
    return (
      <div className="plate plate--photo" style={{ '--cat-color': accent }} aria-hidden="true">
        <img src={image} alt="" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={`plate plate--${variant.pattern}${compact ? ' plate--compact' : ''}`}
      style={{ '--cat-color': accent }}
      aria-hidden="true"
    >
      <span className="plate__ground" />
      <div
        className="plate__art"
        style={{ transform: `translateX(${variant.shift}%) rotate(${variant.rotate}deg) scale(${variant.scale})` }}
      >
        <Art className="die-cut" />
      </div>
    </div>
  );
}
