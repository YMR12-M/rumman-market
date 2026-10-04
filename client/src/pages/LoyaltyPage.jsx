import { Link } from 'react-router-dom';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { Fruit, Aril } from '@/lib/art.jsx';
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
      <header className="page-hero page-hero--red">
        <div className="container page-hero__inner">
          <div>
            <span className="eyebrow">بطاقة رُمّان</span>
            <h1>كلّما تسوّقت، <span className="hl" style={{ color: 'var(--ink-950)' }}>اقتربت أكثر.</span></h1>
            <p className="lede">
              برنامج ولاء بلا اشتراك وبلا رسوم وبلا شروط مخفيّة.
              نقطة على كل جنيه، وكل 20 نقطة تساوي جنيهًا في طلبك التالي.
            </p>

            {isAuthenticated ? (
              <div className="page-hero__actions">
                <div className="stat" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                  <span className="stat__label">نقطة في رصيدك</span>
                  <div className="stat__value">{num(user.loyalty_points)}</div>
                </div>
                <div className="stat" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                  <span className="stat__label">قيمتها عند الاستبدال</span>
                  <div className="stat__value">{money(user.loyalty_points * (data?.point_value_egp ?? 0.05)).replace(' ج.م', '')}<small style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}> ج.م</small></div>
                </div>
              </div>
            ) : (
              <div className="page-hero__actions">
                <Link to="/register" className="btn btn--sun btn--lg">انضم واحصل على 100 نقطة</Link>
                <Link to="/login" className="link-underline">لديّ حساب</Link>
              </div>
            )}
          </div>

          <div className="page-hero__art" aria-hidden="true">
            <div className="mcards">
              <div className="mcard mcard--back">
                <div className="mcard__top"><span className="mcard__chip" /></div>
                <div className="mcard__no">•••• •••• ••••</div>
              </div>
              <div className="mcard">
                <div className="mcard__top">
                  <div className="mcard__name">رُمّان<br />للأعضاء</div>
                  <Fruit size={52} />
                </div>
                <div>
                  <div className="mcard__no">6221 0000 1234</div>
                  <div className="barcode" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section container">
        <SectionHead
          eyebrow="كيف يعمل"
          title="ثلاث خطوات، بلا تعقيد"
        />

        <div className="steps-tags">
          {[
            ['اطلب', 'كل جنيه تنفقه يمنحك نقطة — أو أكثر حسب فئتك.'],
            ['اجمع', 'النقاط تُضاف تلقائيًا عند تسليم الطلب، وتظهر في حسابك مباشرة.'],
            ['استبدل', `استخدم نقاطك عند الدفع لتغطية حتى ${data?.max_redemption_percent ?? 50}% من قيمة السلة.`],
          ].map(([title, note], index) => (
            <div className="step-tag tag reveal" data-delay={index + 1} key={title} style={{ rotate: ['-1.2deg', '0.8deg', '-0.6deg'][index] }}>
              <div className="step-tag__no">0{index + 1}</div>
              <h3>{title}</h3>
              <p>{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section loyalty-band">
        <div className="container">
          <SectionHead eyebrow="الفئات" title="ثلاث فئات، ترقية تلقائية" description="لا تحتاج طلبًا ولا موافقة — نرقّيك تلقائيًا فور بلوغك الحد." />

          <div className="tiers">
            {(data?.tiers ?? []).map((tier, index) => (
              <div key={tier.key} className={`tier tier--${tier.key} reveal${tier.key === 'gold' ? ' tier--featured' : ''}`} data-delay={index + 1}>
                <span className="tier__punch" aria-hidden="true" />
                <div className="tier__name">{tier.label}</div>
                <div className="tier__req">
                  {tier.minSpent === 0 ? 'من أول طلب' : `عند إنفاق ${money(tier.minSpent)}`}
                  {' · '}<span className="numeral">×{tier.multiplier}</span> نقاط
                </div>
                <ul className="tier__perks">
                  {tier.perks.map((perk) => <li key={perk}><Aril size={9} color="currentColor" /> {perk}</li>)}
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
                <IconCheck size={16} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 4 }} /> {line}
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
