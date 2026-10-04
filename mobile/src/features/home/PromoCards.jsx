import { Link } from 'react-router-dom';
import { SectionHead } from '@/components/ui/Feedback.jsx';
import { getArt } from '@/lib/art.jsx';
import { contrastText } from '@/lib/color.js';

/**
 * الحملات التحريرية كقسائم — كل حملة بلونها القادم من القاعدة ولون
 * نصّها بمعادلة التباين، وحدّ تقطيع منقّط وملصق قسمها. لا حملات سارية؟
 * لا قسم.
 */
export default function PromoCards({ promotions }) {
  if (!promotions?.length) return null;

  return (
    <section aria-label="حملات رُمّان">
      <SectionHead title="من رُمّان" />
      <div className="rail" style={{ gridAutoColumns: '78%' }}>
        {promotions.slice(0, 4).map((promo) => {
          const Art = getArt(promo.category_motif || 'basket');
          const accent = promo.accent || '#D5233F';
          const content = (
            <>
              <div className="promo__art" aria-hidden="true"><Art className="die-cut" /></div>
              <div>
                <h3 className="promo__title">{promo.title_ar}</h3>
                {promo.subtitle_ar && <p className="promo__text">{promo.subtitle_ar}</p>}
              </div>
              {promo.cta_href && promo.cta_label && (
                <span className="btn btn--sm" style={{ justifySelf: 'start', background: contrastText(accent), color: accent }}>{promo.cta_label}</span>
              )}
            </>
          );
          const style = { '--promo-bg': accent, '--promo-ink': contrastText(accent) };
          return promo.cta_href
            ? <Link key={promo.slug} to={promo.cta_href} className="promo" style={style}>{content}</Link>
            : <article key={promo.slug} className="promo" style={style}>{content}</article>;
        })}
      </div>
    </section>
  );
}
