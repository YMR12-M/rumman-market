import Screen from '@/components/shell/Screen.jsx';
import { SectionHead } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconChevronDown } from '@/lib/icons.jsx';
import { Burst, getArt } from '@/lib/art.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { num } from '@/lib/format.js';
import { COMMITMENTS, FAQ, HOUSE_LABEL_POINTS, PROMISES, SOURCING_STEPS } from '@/data/content.js';

const TILTS = ['-0.7deg', '0.6deg', '-0.4deg', '0.8deg'];

/**
 * عن رُمّان — النصوص التحريرية من `data/content.js` (المصدر نفسه
 * للواجهة المكتبية)، والأرقام الحيّة من إعدادات المتجر: لا «سبعة فروع»
 * مكتوبة في الكود تصير كذبًا يوم يُغلق فرع.
 */
export default function AboutScreen() {
  const { brand, counts, since_year: since } = useSite();

  /* سنة التأسيس لها ختمها في زاوية البطاقة، فلا تتكرّر بين الأرقام */
  const facts = [
    counts?.branches > 0 && [num(counts.branches), counts.branches === 1 ? 'فرع' : 'فروع'],
    counts?.categories > 0 && [num(counts.categories), 'قسمًا'],
    counts?.products > 0 && [num(counts.products), 'صنفًا'],
  ].filter(Boolean);

  return (
    <Screen title={`عن ${brand?.name || 'رُمّان'}`} back="/account">
      <header className="card card--noir auth-hero" style={{ marginBlockEnd: 0 }}>
        <BrandMark size={48} className="auth-hero__mark" />
        {since && <Burst size={84} tone="sun" className="auth-hero__burst">منذ<b>{since}</b></Burst>}
        <h2 className="auth-hero__title">لا نبيع كل شيء. نبيع ما نأكله نحن.</h2>
        {brand?.tagline && <p className="auth-hero__text">{brand.tagline}</p>}
        {facts.length > 0 && (
          <div className="account-hero__stats" style={{ width: '100%', gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
            {facts.map(([value, label]) => (
              <div key={label} className="account-hero__stat">
                <strong className="numeral">{value}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
        )}
      </header>

      <SectionHead title="وعودنا" />
      <div className="stats">
        {PROMISES.map((promise) => (
          <div key={promise.title} className="stat" style={{ borderInlineStart: `3px solid ${promise.color}` }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{promise.title}</strong>
            <span className="text-xs muted">{promise.note}</span>
          </div>
        ))}
      </div>

      <SectionHead title="كيف نختار ما على الرفّ" eyebrow="أربع مراحل قبل الرفّ" />
      <ol className="step-signs">
        {SOURCING_STEPS.map((step, index) => {
          const Art = getArt(step.motif);
          return (
            <li
              key={step.title}
              className="step-sign"
              style={{
                '--cat': step.color,
                /* آخر لافتة حمراء فنكتب عليها بالأبيض، والباقي فاتح فيُكتب عليه بالحبر */
                '--cat-ink': index === 3 ? '#fff' : 'var(--ink-950)',
                '--tilt': TILTS[index % TILTS.length],
              }}
            >
              <span className="step-sign__code price-num">0{index + 1}</span>
              <div className="step-sign__text">
                <strong>{step.title}</strong>
                <p>{step.note}</p>
              </div>
              <span className="step-sign__art" aria-hidden="true"><Art className="die-cut" /></span>
            </li>
          );
        })}
      </ol>

      <SectionHead title="علامتنا الخاصة" />
      <ul className="card card--pad stack--tight">
        {HOUSE_LABEL_POINTS.map((line) => (
          <li key={line} className="row text-sm" style={{ alignItems: 'flex-start' }}>
            <IconCheck size={16} className="text-brand" style={{ marginBlockStart: 4 }} /> {line}
          </li>
        ))}
      </ul>

      <SectionHead title="التزامات نُحاسَب عليها" />
      <ul className="card card--noir card--pad stack--tight">
        {COMMITMENTS.map((line) => (
          <li key={line} className="row text-sm" style={{ alignItems: 'flex-start', color: 'var(--ink-100)' }}>
            <IconCheck size={16} style={{ color: 'var(--gold-300)', marginBlockStart: 4 }} /> {line}
          </li>
        ))}
      </ul>

      <SectionHead title="الأسئلة الشائعة" />
      <div className="card" style={{ paddingInline: 'var(--s-4)' }}>
        {FAQ.map(([question, answer]) => (
          <details key={question} className="accordion">
            <summary>{question} <IconChevronDown size={18} /></summary>
            <p className="accordion__body">{answer}</p>
          </details>
        ))}
      </div>
    </Screen>
  );
}
