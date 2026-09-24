import { IconPlus, IconMinus } from '@/lib/icons.jsx';

/** عدّاد كمية بحدّ أدنى وأقصى */
export default function Stepper({ value, onChange, min = 0, max = 99, disabled = false }) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="إنقاص الكمية"
      >
        <IconMinus size={15} />
      </button>
      <span className="stepper__value" aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="زيادة الكمية"
      >
        <IconPlus size={15} />
      </button>
    </div>
  );
}
