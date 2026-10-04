import { Link } from 'react-router-dom';
import { getArt } from '@/lib/art.jsx';
import { contrastText } from '@/lib/color.js';

/**
 * المساحات التحريرية (الحملات) كقسائم/منشورات عروض.
 * كل حملة بلونها القادم من القاعدة، وحدّ تقطيع منقّط داخلها،
 * وثقبان على جانبيها كقسيمة، وملصق القسم الذي تخصّه.
 */
export default function PromoStrip({ promotions, limit = 3 }) {
  if (!promotions?.length) return null;

  return (
    <div className="editorial">
      {promotions.slice(0, limit).map((promo, index) => {
        const Art = getArt(promo.category_motif || 'basket');
        const ink = contrastText(promo.accent);
        return (
          <article
            className="promo-card reveal"
            data-delay={index + 1}
            key={promo.slug}
            style={{ '--promo-bg': promo.accent, '--promo-ink': ink, '--cat-color': promo.accent, '--tilt': index % 2 ? '0.5deg' : '-0.5deg' }}
          >
            <span className="promo-card__pattern halftone" aria-hidden="true" />
            <div className="promo-card__art" aria-hidden="true"><Art className="die-cut" /></div>
            <div className="promo-card__body">
              <h3>{promo.title_ar}</h3>
              <p>{promo.subtitle_ar}</p>
              {promo.cta_href && (
                <Link to={promo.cta_href} className="btn btn--sm promo-card__cta">
                  {promo.cta_label}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
