import { Link } from 'react-router-dom';
import { money } from '@/lib/format.js';

const TIER_LABELS = { silver: 'الفضّية', gold: 'الذهبية', platinum: 'البلاتينية' };

/** بطاقة تقدّم فئة الولاء مع شريط يوضّح كم بقي للفئة التالية */
export default function TierProgress({ profile }) {
  if (!profile) return null;

  const nextTier = profile.next_tier;
  const progress = nextTier
    ? Math.min(100, (Number(profile.total_spent) / nextTier.minSpent) * 100)
    : 100;

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ marginBottom: 4 }}>العضوية</span>
          <h3 style={{ fontSize: 'var(--t-md)' }}>الفئة {TIER_LABELS[profile.loyalty_tier]}</h3>
        </div>
        <Link to="/account/loyalty" className="link-underline" style={{ fontSize: 'var(--t-sm)' }}>تفاصيل النقاط</Link>
      </div>

      {nextTier ? (
        <>
          <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--s-3)' }}>
            تبقّى <strong className="numeral">{money(profile.spend_to_next_tier)}</strong> للوصول إلى الفئة {TIER_LABELS[nextTier.key]}.
          </p>
          <div className="free-ship-bar__track" style={{ marginTop: 'var(--s-2)' }}>
            <div className="free-ship-bar__fill" style={{ width: `${progress}%`, background: 'var(--brand)' }} />
          </div>
        </>
      ) : (
        <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--s-3)' }}>
          وصلت إلى أعلى فئة — شكرًا لثقتك.
        </p>
      )}
    </div>
  );
}
