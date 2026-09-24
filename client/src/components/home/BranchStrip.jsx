import { IconPin, IconClock, IconTruck } from '@/lib/icons.jsx';
import { money } from '@/lib/format.js';

/** بطاقات مختصرة للفروع — النقر عليها يفتح محدّد الفرع */
export default function BranchStrip({ branches, activeBranchId, onPick, limit = 4 }) {
  return (
    <div className="cats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {branches.slice(0, limit).map((branch, index) => (
        <button
          key={branch.id}
          type="button"
          className={`branch-card reveal${branch.id === activeBranchId ? ' is-active' : ''}`}
          data-delay={index + 1}
          onClick={onPick}
          style={{ textAlign: 'start' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-2)' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>{branch.name_ar}</strong>
            <span className="branch-card__code">{branch.code}</span>
          </div>

          <div className="branch-card__meta">
            <div><IconPin size={14} /> {branch.city}</div>
            <div>
              <IconClock size={14} />
              {branch.is_24h ? 'مفتوح ٢٤ ساعة' : `${String(branch.opens_at).slice(0, 5)} — ${String(branch.closes_at).slice(0, 5)}`}
            </div>
            <div><IconTruck size={14} /> التوصيل من {money(branch.delivery_fee)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
