import { Link } from 'react-router-dom';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { IconCheck, IconGift } from '@/lib/icons.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { money, num } from '@/lib/format.js';

/** صفحة تعريفية ببرنامج الولاء — عامة للجميع */
export default function LoyaltyPage() {
  const { isAuthenticated, user } = useAuth();
  const program = useAsync(() => catalogService.loyaltyTiers(), []);
  const data = program.data;

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <span className="eyebrow">بطاقة رُمّان</span>
            <h1 className="hero__title">كلّما تسوّقت،<em>اقتربت أكثر.</em></h1>
            <p className="hero__lede">
              برنامج ولاء بلا اشتراك وبلا رسوم وبلا شروط مخفيّة.
              نقطة على كل جنيه، وكل 20 نقطة تساوي جنيهًا في طلبك التالي.
            </p>

            {isAuthenticated ? (
              <div className="hero__stats" style={{ marginTop: 'var(--s-5)', paddingTop: 'var(--s-4)' }}>
                <div>
                  <div className="hero__stat-value">{num(user.loyalty_points)}</div>
                  <div className="hero__stat-label">نقطة في رصيدك</div>
                </div>
                <div>
                  <div className="hero__stat-value">{money(user.loyalty_points * (data?.point_value_egp ?? 0.05))}</div>
                  <div className="hero__stat-label">قيمتها عند الاستبدال</div>
                </div>
              </div>
            ) : (
              <div className="hero__cta">
                <Link to="/register" className="btn btn--saffron btn--lg">انضم واحصل على 100 نقطة</Link>
                <Link to="/login" className="btn btn--outline btn--lg" style={{ color: 'var(--ivory)', borderColor: 'rgba(251,248,241,.3)' }}>
                  لديّ حساب
                </Link>
              </div>
            )}
          </div>

          <div className="hero__art">
            <BrandMark size={200} seedColor="var(--gold-400)" />
            <span className="hero__art-caption">عضوية رُمّان</span>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHead
          eyebrow="كيف يعمل"
          title="ثلاث خطوات، بلا تعقيد"
        />

        <div className="editorial">
          {[
            ['اطلب', 'كل جنيه تنفقه يمنحك نقطة — أو أكثر حسب فئتك.'],
            ['اجمع', 'النقاط تُضاف تلقائيًا عند تسليم الطلب، وتظهر في حسابك مباشرة.'],
            ['استبدل', `استخدم نقاطك عند الدفع لتغطية حتى ${data?.max_redemption_percent ?? 50}% من قيمة السلة.`],
          ].map(([title, note], index) => (
            <div className="panel" key={title}>
              <div className="numeral" style={{ color: 'var(--accent-text)', fontSize: 'var(--t-lg)' }}>0{index + 1}</div>
              <h3 style={{ fontSize: 'var(--t-md)', marginBlock: 'var(--s-2)' }}>{title}</h3>
              <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section loyalty-band">
        <div className="container">
          <SectionHead eyebrow="الفئات" title="ثلاث فئات، ترقية تلقائية" description="لا تحتاج طلبًا ولا موافقة — نرقّيك تلقائيًا فور بلوغك الحد." />

          <div className="tiers">
            {(data?.tiers ?? []).map((tier) => (
              <div key={tier.key} className={`tier${tier.key === 'gold' ? ' tier--featured' : ''}`}>
                <div className="tier__name">{tier.label}</div>
                <div className="tier__req">
                  {tier.minSpent === 0 ? 'من أول طلب' : `عند إنفاق ${money(tier.minSpent)}`}
                  {' · '}<span className="numeral">×{tier.multiplier}</span> نقاط
                </div>
                <ul className="tier__perks">
                  {tier.perks.map((perk) => <li key={perk}><IconCheck size={14} /> {perk}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container container--narrow">
        <div className="panel">
          <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <IconGift size={19} style={{ color: 'var(--brand-text)' }} /> تفاصيل مهمّة
          </h3>
          <ul style={{ display: 'grid', gap: 'var(--s-2)' }}>
            {[
              `النقطة تساوي ${money(data?.point_value_egp ?? 0.05)} عند الاستبدال.`,
              `لا يمكن أن تغطّي النقاط أكثر من ${data?.max_redemption_percent ?? 50}% من قيمة السلة في الطلب الواحد.`,
              'تُضاف النقاط عند تسليم الطلب لا عند إنشائه — وتُعاد إليك كاملة إن أُلغي الطلب.',
              'النقاط لا تنتهي صلاحيتها ما دام الحساب نشطًا.',
              'يمكن جمع النقاط مع كود خصم في نفس الطلب.',
            ].map((line) => (
              <li key={line} style={{ display: 'flex', gap: 'var(--s-2)', fontSize: 'var(--t-sm)' }}>
                <IconCheck size={16} style={{ color: 'var(--gold-400)', flexShrink: 0, marginTop: 4 }} /> {line}
              </li>
            ))}
          </ul>

          <Link to={isAuthenticated ? '/account/loyalty' : '/register'} className="btn btn--primary" style={{ marginTop: 'var(--s-5)' }}>
            {isAuthenticated ? 'اعرض رصيدي وحركة نقاطي' : 'أنشئ حسابك الآن'}
          </Link>
        </div>
      </section>
    </>
  );
}
