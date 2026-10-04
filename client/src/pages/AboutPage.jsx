import { Link } from 'react-router-dom';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { OpenFruit, Burst, getArt } from '@/lib/art.jsx';
import { IconCheck, IconLeaf, IconStore, IconShield } from '@/lib/icons.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { num } from '@/lib/format.js';
import { SOURCING_STEPS, COMMITMENTS, FAQ } from '@/data/content.js';

export default function AboutPage() {
  const { branches } = useBranch();
  const { counts, since_year: since, brand } = useSite();

  /**
   * الأرقام تُبنى من الواقع، وما كان صفرًا لا يُعرض.
   * صفحة «عن المتجر» هي آخر مكان يجوز فيه رقمٌ مخترع — من يقرأها
   * يقرأها ليقرّر إن كان يثق بنا.
   */
  const figures = [
    since && [String(since), 'سنة التأسيس'],
    counts.branches > 0 && [num(counts.branches), counts.branches === 1 ? 'فرع' : 'فروع'],
    counts.categories > 0 && [num(counts.categories), 'قسمًا'],
    counts.products > 0 && [num(counts.products), 'صنفًا في الكتالوج'],
  ].filter(Boolean);

  return (
    <>
      {/* البطل */}
      <header className="page-hero">
        <div className="container page-hero__inner">
          <div>
            <span className="eyebrow">عن رُمّان</span>
            <h1>لا نبيع كل شيء.<br /><span className="hl">نبيع ما نأكله نحن.</span></h1>
            <p className="lede">
              {since ? `بدأت ${brand.name} سنة ${since} بفكرة بسيطة: ` : `تقوم ${brand.name} على فكرة بسيطة: `}
              أن يكون اختيار المنتج مسؤولية المتجر لا مسؤولية العميل.
            </p>
          </div>

          <div className="page-hero__art" aria-hidden="true">
            <div className="about-board">
              <div className="hero__disc halftone" />
              <OpenFruit size={320} className="open-fruit" />
              {since && <Burst size={100} tone="sun" className="hero__burst">منذ<b>{since}</b></Burst>}
            </div>
          </div>
        </div>
      </header>

      {/* الأرقام */}
      {figures.length > 0 && (
        <section className="section--tight container">
          <div className="figures">
            {figures.map(([value, label]) => (
              <div className="figure" key={label}>
                <div className="figure__value numeral">{value}</div>
                <div className="figure__label">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* القصّة */}
      <section className="section section--sunken">
        <div className="container story">
          <div className="reveal">
            <span className="eyebrow">القصّة</span>
            <h2>قاعدة واحدة لم تتغيّر</h2>
            <div className="stack" style={{ marginTop: 'var(--s-4)' }}>
              <p>
                حين فتحنا الباب أول مرة، كانت الرفوف نصف ممتلئة. لم يكن ذلك نقص تمويل،
                بل نقص اقتناع: لم نجد ما يستحق أن يُعرض في النصف الآخر.
              </p>
              <p>
                ومع الوقت صار هذا هو التعريف: رُمّان ليست متجرًا يعرض كل شيء ويترك لك الاختيار،
                بل متجر يختار أولًا. القصّاب والخبّاز والمحمّص جزء من الفريق لا من الديكور،
                والمزارع شريك نعرف اسمه ونكتبه على البطاقة.
              </p>
              <p>
                لم يتغيّر شيء في الطريقة منذ أول يوم — تغيّر عدد الناس الذين يثقون بها فقط.
              </p>
            </div>
          </div>

          <div className="story__panel reveal" data-delay="2">
            <span className="tape" style={{ insetBlockStart: 16, insetInlineStart: 22, '--tape-tilt': '-8deg' }} />
            <OpenFruit size={250} style={{ rotate: '-8deg', filter: 'drop-shadow(-6px 7px 0 var(--ink-950))' }} />
          </div>
        </div>
      </section>

      {/* كيف نختار */}
      <section className="section container" id="sourcing">
        <SectionHead
          eyebrow="كيف نختار"
          title="أربع مراحل قبل الرفّ"
          description="لا يدخل صنف إلى رُمّان لأن مندوبه مرّ علينا. هذه هي الطريقة."
        />

        <div className="sourcing">
          {SOURCING_STEPS.map((step, index) => {
            const Art = getArt(step.motif);
            /* ألوان الخطوات رموز CSS لا ست عشرية، فنحدّد لون الحبر فوقها يدويًا */
            const ink = index === 3 ? '#fff' : 'var(--ink-950)';
            return (
              <article
                className="aisle sign reveal"
                key={step.title}
                data-delay={index + 1}
                style={{ '--cat-color': step.color, '--cat-ink': ink, '--tilt': ['-0.7deg', '0.6deg', '-0.4deg', '0.8deg'][index] }}
              >
                <span className="sign__screw sign__screw--tl" />
                <span className="sign__screw sign__screw--tr" />
                <div className="aisle__code"><span className="price-num">0{index + 1}</span></div>
                <div className="aisle__text">
                  <div className="aisle__name">{step.title}</div>
                  <div className="aisle__tag">{step.note}</div>
                </div>
                <div className="aisle__art" aria-hidden="true"><Art className="die-cut" /></div>
              </article>
            );
          })}
        </div>

      </section>

      {/* العلامة الخاصة */}
      <section className="section section--sunken" id="house">
        <div className="container">
          <SectionHead
            eyebrow="مختارات رُمّان"
            title="علامتنا الخاصة"
            description="حين لا نجد المنتج بالجودة التي نريدها، نصنعه بأنفسنا."
          />

          <div className="editorial">
            {[
              [IconLeaf, 'مكوّن واحد', 'زبدة اللوز عندنا مكوّنها: لوز. لا سكر ولا زيت نخيل ولا مثبّتات.'],
              [IconStore, 'مصدر واحد', 'كل دفعة من مزرعة واحدة محدّدة — لا خلط بين مصادر لتقليل التكلفة.'],
              [IconShield, 'جودة ثابتة', 'إن تعذّر الوصول لنفس الجودة، نوقف المنتج مؤقتًا بدل تغيير التركيبة بصمت.'],
            ].map(([Icon, title, note]) => (
              <div className="panel" key={title}>
                <Icon size={26} style={{ color: 'var(--brand-text)' }} />
                <h3 style={{ fontSize: 'var(--t-md)', marginBlock: 'var(--s-3) var(--s-2)' }}>{title}</h3>
                <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{note}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--s-6)' }}>
            <Link to="/shop?exclusive=true" className="btn btn--primary">تصفّح مختارات رُمّان</Link>
          </div>
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section className="section container container--narrow">
        <SectionHead eyebrow="أسئلة يسألها الناس" title="إجابات مباشرة" />
        {FAQ.map(([question, answer]) => <FaqItem key={question} question={question} answer={answer} />)}
      </section>

      {/* التزاماتنا */}
      <section className="section--tight container" style={{ paddingBottom: 'var(--s-9)' }}>
        <div className="commit-panel">
          <span className="eyebrow eyebrow--onDark">التزامنا</span>
          <h2>خمسة أشياء نعد بها، ونُحاسَب عليها</h2>
          <ul style={{ display: 'grid', gap: 'var(--s-3)' }}>
            {COMMITMENTS.map((line) => (
              <li key={line}>
                <IconCheck size={17} /> {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/** عنصر سؤال/جواب قابل للطيّ */
function FaqItem({ question, answer }) {
  return (
    <details className="faq-item">
      <summary className="faq-item__q" style={{ listStyle: 'none', cursor: 'pointer' }}>
        {question}
        <span aria-hidden="true" className="faq-item__plus">+</span>
      </summary>
      <p className="faq-item__a">{answer}</p>
    </details>
  );
}
