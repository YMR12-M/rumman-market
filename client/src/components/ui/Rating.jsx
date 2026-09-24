import { IconStar } from '@/lib/icons.jsx';

/** نجوم التقييم — تُقرّب لأقرب نصف نجمة بصريًا (نملأ عند ≥ 0.5) */
export default function Rating({ value = 0, count, size = 14, showValue = true }) {
  const score = Number(value) || 0;

  return (
    <span className="rating" title={`${score} من 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          size={size}
          filled={score >= star - 0.5}
          className={score >= star - 0.5 ? 'rating__star' : 'rating__star rating__star--empty'}
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
