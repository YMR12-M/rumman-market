import { Link } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import { SectionHead, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCheck } from '@/lib/icons.jsx';
import { Aril } from '@/lib/art.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * برنامج الولاء — الفئات وشروطها وقيمة النقطة وحدّ الاستبدال كلّها من
 * الخادم، المصدر نفسه الذي يحسب النقاط عند الشراء. لو اختلف الاثنان
 * لوعدنا العميل بشيء ثم أعطيناه غيره.
 */
export default function LoyaltyProgramScreen() {
  const { isAuthenticated, user } = useAuth();
  const program = useAsync(() => catalogService.loyaltyTiers(), []);
  const data = program.data;
  const pointValue = Number(data?.point_value_egp ?? 0);

  return (
    <Screen title="برنامج الولاء" back="/account">
      <header className="card card--noir auth-hero" style={{ marginBlockEnd: 0 }}>
        <BrandMark size={48} className="auth-hero__mark" />
        <h2 className="auth-hero__title">كلّما تسوّقت، اقتربت أكثر.</h2>
        <p className="auth-hero__text">برنامج ولاء بلا اشتراك وبلا رسوم.</p>
        {isAuthenticated ? (
          <div className="account-hero__stats" style={{ width: '100%' }}>
            <div className="account-hero__stat"><small>في رصيدك</small><strong className="numeral">{num(user.loyalty_points)}</strong></div>
            {pointValue > 0 && (
              <div className="account-hero__stat"><small>قيمتها</small><strong className="ltr">{money(user.loyalty_points * pointValue)}</strong></div>
            )}
          </div>
        ) : (
          <Link to="/register" className="btn btn--lux">انضم الآن</Link>
        )}
      </header>

      <SectionHead title="الفئات" eyebrow="ترقية تلقائية فور بلوغ الحدّ" />
      {program.loading && <Skeleton height={200} radius="var(--r-lg)" />}
      <div className="tier-cards">
        {(data?.tiers ?? []).map((tier) => {
          const mine = tier.key === user?.loyalty_tier;
          return (
            <article key={tier.key} className={`tier-card tier-card--${tier.key}${mine ? ' tier-card--mine' : ''}`}>
              <span className="tier-card__punch" aria-hidden="true" />
              <div className="row row--between">
                <strong className="tier-card__name">{tier.label}</strong>
                <span className="badge badge--lux"><span className="numeral">×{tier.multiplier}</span> نقاط</span>
              </div>
              <span className="tier-card__req">
                {Number(tier.minSpent) > 0 ? <>عند إنفاق <span className="ltr">{money(tier.minSpent)}</span></> : 'من أول طلب'}
                {mine && <em className="tier-card__you">أنت هنا</em>}
              </span>
              <ul className="tier-card__perks">
                {(tier.perks ?? []).map((perk) => (
                  <li key={perk}><Aril size={9} color="currentColor" /> {perk}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {data && (
        <section className="card card--pad" style={{ marginBlockStart: 'var(--s-5)' }}>
          <h2 className="card__title">تفاصيل مهمّة</h2>
          <ul className="stack--tight text-sm">
            {[
              pointValue > 0 && <>النقطة تساوي <span className="ltr">{money(pointValue)}</span> عند الاستبدال.</>,
              Number(data.max_redemption_percent) > 0 && <>لا تغطّي النقاط أكثر من <span className="numeral">{num(data.max_redemption_percent)}%</span> من قيمة السلة في الطلب الواحد.</>,
              'تُضاف النقاط عند تسليم الطلب لا عند إنشائه.',
              'يمكن جمع النقاط مع كود خصم في الطلب نفسه.',
            ].filter(Boolean).map((line, index) => (
              <li key={index} className="row" style={{ gap: 'var(--s-2)', alignItems: 'flex-start' }}>
                <IconCheck size={15} style={{ color: 'var(--lux)', marginBlockStart: 4 }} /> <span>{line}</span>
              </li>
            ))}
          </ul>
          <Link to={isAuthenticated ? '/account/loyalty' : '/register'} className="btn btn--primary btn--block" style={{ marginBlockStart: 'var(--s-4)' }}>
            {isAuthenticated ? 'اعرض رصيدي وحركة نقاطي' : 'أنشئ حسابك'}
          </Link>
        </section>
      )}
    </Screen>
  );
}
