import { IconPin, IconClock, IconTruck } from '@/lib/icons.jsx';
import { money } from '@/lib/format.js';

/**
 * بطاقات الفروع كواجهات محلّات صغيرة: مظلّة مخطّطة فوق كل بطاقة،
 * ولافتة «مفتوح/مغلق» معلّقة كالتي على الأبواب. النقر يفتح محدّد الفرع.
 * حالة الفتح تأتي محسوبة من الخادم (is_open_now) — لا نخمّنها هنا.
 */
export default function BranchStrip({ branches, activeBranchId, onPick, limit = 4 }) {
  return (
    <div className="cats branch-strip">
      {branches.slice(0, limit).map((branch, index) => (
        <button
          key={branch.id}
          type="button"
          className={`branch-card reveal${branch.id === activeBranchId ? ' is-active' : ''}`}
          data-delay={index + 1}
          onClick={onPick}
          style={{ textAlign: 'start' }}
        >
          <span className="branch-card__awning awning awning--sm" aria-hidden="true" />

          <div className="branch-card__head">
            <strong>{branch.name_ar}</strong>
            <span className="branch-card__code">{branch.code}</span>
          </div>

          {typeof branch.is_open_now === 'boolean' && (
            <span className={`door-sign ${branch.is_open_now ? 'is-open' : 'is-closed'}`}>
              {branch.is_open_now ? 'مفتوح الآن' : 'مغلق الآن'}
            </span>
          )}

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
