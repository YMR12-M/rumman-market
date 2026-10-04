import { Aril } from '@/lib/art.jsx';

/**
 * تقييم بحبّات الرمّان بدل النجوم — خمس حبّات تُملأ بالأحمر.
 * تُقرَّب لأقرب نصف حبّة بصريًا (نملأ عند ≥ 0.5).
 */
export default function Rating({ value = 0, count, size = 14, showValue = true }) {
  const score = Number(value) || 0;

  return (
    <span className="rating" title={`${score} من 5`}>
      {[1, 2, 3, 4, 5].map((seed) => (
        <Aril
          key={seed}
          size={size}
          className={score >= seed - 0.5 ? 'rating__star' : 'rating__star rating__star--empty'}
        />
      ))}
      {showValue && (
        <span className="rating__value numeral">
          {score.toFixed(1)}{count != null ? ` (${count})` : ''}
        </span>
      )}
    </span>
  );
}
