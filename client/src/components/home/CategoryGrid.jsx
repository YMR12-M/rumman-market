import { Link } from 'react-router-dom';
import { getArt } from '@/lib/art.jsx';
import { contrastText } from '@/lib/color.js';
import { num } from '@/lib/format.js';

/**
 * شبكة الأقسام كلافتات ممرّات معلّقة.
 * لون كل لافتة يأتي من `accent_color` في قاعدة البيانات، ورقم الممرّ
 * من `aisle_code`. وحين لا يكون للقسم رقم ممرّ نعرض ترتيبه بلا كلمة
 * «ممر» — حتى لا ندّعي رقمًا لا وجود له في المتجر.
 *
 * لون النصّ يُحسب من سطوع لون القسم لا يُفترض — فالأصفر والليموني
 * يحتاجان نصًّا داكنًا بينما الأحمر والأزرق يحتاجان أبيض.
 */
const TILTS = ['-0.7deg', '0.6deg', '-0.4deg', '0.8deg', '-0.9deg', '0.4deg'];

export default function CategoryGrid({ categories }) {
  return (
    <div className="aisles">
      {categories.map((category, index) => {
        const Art = getArt(category.motif);
        const accent = category.accent_color;
        const hasAisle = Boolean(category.aisle_code);
        const code = hasAisle ? category.aisle_code : String(index + 1).padStart(2, '0');

        return (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            className="aisle sign reveal"
            data-delay={(index % 5) + 1}
            style={{
              '--cat-color': accent,
              '--cat-ink': contrastText(accent),
              '--tilt': TILTS[index % TILTS.length],
            }}
          >
            <span className="sign__screw sign__screw--tl" />
            <span className="sign__screw sign__screw--tr" />

            <div className="aisle__code">
              {hasAisle && <small>ممر</small>}
              <span className="price-num">{code}</span>
            </div>

            <div className="aisle__text">
              <div className="aisle__name">{category.name_ar}</div>
              <div className="aisle__tag">{category.tagline_ar}</div>
            </div>

            <span className="aisle__count">
              <b className="price-num">{num(category.products_count)}</b> صنف
            </span>

            <div className="aisle__art" aria-hidden="true">
              <Art className="die-cut" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
