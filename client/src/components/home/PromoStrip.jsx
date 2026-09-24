import { Link } from 'react-router-dom';
import { getMotif } from '@/lib/motifs.jsx';
import { contrastText } from '@/lib/color.js';

/** المساحات التحريرية (الحملات) — كل حملة بلونها القادم من القاعدة */
export default function PromoStrip({ promotions, limit = 3 }) {
  if (!promotions?.length) return null;

  return (
    <div className="editorial">
      {promotions.slice(0, limit).map((promo, index) => {
        const Motif = getMotif(promo.category_motif || 'leaf');
        return (
          <article
            className="promo-card reveal"
            data-delay={index + 1}
            key={promo.slug}
            style={{ background: promo.accent, '--cat-ink': contrastText(promo.accent) }}
          >
            <Motif className="promo-card__motif" />
            <h3>{promo.title_ar}</h3>
            <p>{promo.subtitle_ar}</p>
            {promo.cta_href && (
              <Link to={promo.cta_href} className="btn btn--sm" style={{ background: '#fff', color: 'var(--ink-950)' }}>
                {promo.cta_label}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
