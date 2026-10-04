import { useMemo } from 'react';
import { getItemArt } from '@/lib/art-items.jsx';

/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة المنتج — ورقة ملوّنة عليها ملصق المنتج
 *
 *  نفس لوحة الواجهة المكتبية: صورة المنتج إن وُجدت، وإلا ملصق مقصوص
 *  بإطار عاجي فوق ورقة بلون القسم. الملصق يُختار من **اسم المنتج**
 *  (رمّان ← رمّانة، جبنة ← قطعة جبن) وإلا فملصق قسمه.
 *
 *  خمسة منتجات في قسم واحد لا تتشابه لوحاتها: نمط الخلفية (نقاط/خطوط/
 *  مربّعات/شمس) والميل والإزاحة مشتقّة من اسم المنتج نفسه، فتبقى ثابتة
 *  في كل تحميل.
 * ═══════════════════════════════════════════════════════════════
 */

/** بصمة رقمية بسيطة — الاسم نفسه يعطي الرقم نفسه دائمًا */
function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

const PATTERNS = ['dots', 'stripes', 'grid', 'sun'];

export default function ProductPlate({ name = '', motif = 'leaf', accent, image = null, compact = false }) {
  const Art = getItemArt(name, motif);

  const variant = useMemo(() => {
    const seed = hash(name || motif);
    return {
      pattern: PATTERNS[seed % PATTERNS.length],
      rotate: ((seed >> 3) % 13) - 6,
      scale: 0.94 + ((seed >> 7) % 13) / 100,
      shift: ((seed >> 11) % 9) - 4,
    };
  }, [name, motif]);

  // لون القسم من القاعدة؛ إن غاب نرجع إلى لون البراند من التوكنات
  const style = { '--cat-color': accent || 'var(--brand)' };

  if (image) {
    return (
      <div className="plate plate--photo" style={style} aria-hidden="true">
        <img src={image} alt="" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`plate plate--${variant.pattern}${compact ? ' plate--compact' : ''}`} style={style} aria-hidden="true">
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
