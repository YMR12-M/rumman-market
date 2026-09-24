import { Link } from 'react-router-dom';
import { getMotif } from '@/lib/motifs.jsx';
import { contrastText, isLight } from '@/lib/color.js';

/**
 * شبكة الأقسام ككتل لونية.
 * لون كل بطاقة يأتي من `accent_color` في قاعدة البيانات، فتُصبح
 * الشبكة «رمّانة مفتوحة»: حبّات مختلفة الألوان داخل إطار واحد.
 *
 * لون النصّ يُحسب من سطوع لون القسم لا يُفترض — فالزعفراني والليموني
 * يحتاجان نصًّا داكنًا بينما الياقوتي والعنبي يحتاجان أبيض.
 */
export default function CategoryGrid({ categories }) {
  return (
    <div className="cats">
      {categories.map((category, index) => {
        const Motif = getMotif(category.motif);
        const accent = category.accent_color;
        const light = isLight(accent);

        return (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            className="cat-card reveal"
            data-delay={(index % 5) + 1}
            style={{
              '--cat-color': accent,
              '--cat-ink': contrastText(accent),
              '--cat-motif-opacity': light ? 0.32 : 0.24,
              '--cat-chip': light ? 'rgba(42,18,32,.14)' : 'rgba(255,255,255,.24)',
            }}
          >
            <Motif className="cat-card__motif" />
            <div>
              <div className="cat-card__name">{category.name_ar}</div>
              <div className="cat-card__tag">{category.tagline_ar}</div>
            </div>
            <span className="cat-card__count">{category.products_count} صنف</span>
          </Link>
        );
      })}
    </div>
  );
}
