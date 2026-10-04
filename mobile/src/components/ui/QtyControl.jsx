import { IconMinus, IconPlus, IconTrash } from '@/lib/icons.jsx';
import { haptic } from '@/lib/haptics.js';

/**
 * ضابط الكمية: − الرقم +
 *
 * على الهاتف أفضل من حقل رقمي لنفس سبب إخفاء أسهم الحقل: رفع الكمية
 * من 2 إلى 3 يجب أن يكون نقرة، لا «استدعِ لوحة الأرقام، حدّد، اكتب».
 * عند الكمية الدنيا يصير زرّ النقصان زرّ حذف إن مُرّر `onRemove` —
 * فلا يحتاج العميل البحث عن سلة المهملات لسطرٍ واحد.
 */
export default function QtyControl({
  value, onChange, min = 1, max = 99, onRemove, compact = false, label = 'الكمية', busy = false,
}) {
  const atMin = value <= min;
  const atMax = value >= max;

  const change = (next) => {
    haptic('tap');
    onChange(Math.max(min, Math.min(max, next)));
  };

  return (
    <div className={`qty${compact ? ' qty--compact' : ''}`} role="group" aria-label={label}>
      {atMin && onRemove ? (
        <button type="button" className="qty__btn" onClick={() => { haptic('warn'); onRemove(); }} aria-label="حذف" disabled={busy}>
          <IconTrash size={compact ? 16 : 18} />
        </button>
      ) : (
        <button type="button" className="qty__btn" onClick={() => change(value - 1)} disabled={atMin || busy} aria-label="إنقاص الكمية">
          <IconMinus size={compact ? 16 : 18} />
        </button>
      )}

      <span className="qty__value numeral" aria-live="polite">{value}</span>

      <button type="button" className="qty__btn" onClick={() => change(value + 1)} disabled={atMax || busy} aria-label="زيادة الكمية">
        <IconPlus size={compact ? 16 : 18} />
      </button>
    </div>
  );
}
