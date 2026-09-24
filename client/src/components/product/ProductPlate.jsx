import { useMemo } from 'react';
import { getMotif } from '@/lib/motifs.jsx';
import { initial } from '@/lib/format.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة المنتج — البديل البصري للصور الفوتوغرافية
 *
 *  الطبقات، وكلّها مشتقّة من **لون القسم**:
 *   ١. خلفية بلون القسم مخفّفًا + شبكة نقاط ناعمة.
 *   ٢. الحرف الأول من اسم المنتج بحجم كبير في الزاوية.
 *   ٣. زخرفة القسم الخطّية بلونه الكامل في المنتصف.
 *   ٤. كبسولة اسم القسم + ختم RUMMAN.
 *
 *  مشكلة كانت واردة: خمسة منتجات في قسم واحد تتشابه لوحاتها.
 *  الحل: نشتق **دورانًا وإزاحة** ثابتين من اسم المنتج نفسه، فتختلف
 *  كل لوحة عن جارتها بينما تبقى النتيجة ثابتة في كل تحميل.
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

export default function ProductPlate({
  name = '',
  motif = 'leaf',
  accent = '#D81E4A',
  categoryLatin = 'RUMMAN',
  compact = false,
}) {
  const Motif = getMotif(motif);

  const variant = useMemo(() => {
    const seed = hash(name || motif);
    return {
      rotate: ((seed % 17) - 8),          // من -8 إلى +8 درجة
      scale: 1 + ((seed >> 5) % 9) / 100, // من 1.00 إلى 1.08
      shiftX: ((seed >> 9) % 11) - 5,     // إزاحة أفقية خفيفة
    };
  }, [name, motif]);

  const style = {
    '--plate-bg': `color-mix(in srgb, ${accent} 13%, var(--bg-raised))`,
    '--plate-dot': `color-mix(in srgb, ${accent} 26%, transparent)`,
    '--plate-accent': accent,
  };

  return (
    <div className="plate" style={style} aria-hidden="true">
      <span className="plate__glyph">{initial(name)}</span>

      <Motif
        className="plate__motif"
        style={{ transform: `rotate(${variant.rotate}deg) scale(${variant.scale}) translateX(${variant.shiftX}px)` }}
      />

      {!compact && (
        <>
          <span className="plate__eyebrow">{categoryLatin}</span>
          <span className="plate__stamp">RUMMAN</span>
        </>
      )}
    </div>
  );
}
