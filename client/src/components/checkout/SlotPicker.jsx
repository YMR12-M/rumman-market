/** اختيار يوم وشريحة التوصيل، مع إظهار السعة المتبقية لكل شريحة */
export default function SlotPicker({ days, selectedDate, onDateChange, slots, selectedSlot, onSlotChange }) {
  return (
    <div className="panel">
      <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>موعد التوصيل</h3>

      <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-4)', flexWrap: 'wrap' }}>
        {days.map((day) => (
          <button
            key={day.value}
            type="button"
            className={`btn btn--sm ${selectedDate === day.value ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => onDateChange(day.value)}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="slot-grid">
        {(slots ?? []).map((option) => (
          <button
            key={option.from}
            type="button"
            className={`slot${selectedSlot?.from === option.from ? ' is-selected' : ''}`}
            disabled={!option.available}
            onClick={() => onSlotChange(option)}
            title={option.reason ?? ''}
          >
            {option.label}
            <span className="slot__time numeral">{option.from} — {option.to}</span>
            {option.available && (
              <span style={{ fontSize: '0.625rem', opacity: 0.75 }}>{option.remaining} مكان متاح</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
