import { Link } from 'react-router-dom';
import { getArt } from '@/lib/art.jsx';
import { contrastText } from '@/lib/color.js';
import { num } from '@/lib/format.js';

/**
 * لافتات الأقسام — لون كل لافتة من قاعدة البيانات ورقم ممرّها من
 * `aisle_code`. وحين لا يكون للقسم رقم ممرّ نعرض ترتيبه بلا كلمة «ممر»
 * حتى لا ندّعي رقمًا لا وجود له في المتجر. لون النصّ يُحسب بمعادلة
 * التباين فيبقى الاسم مقروءًا مهما كان اللون الذي اختاره مدير المتجر.
 */
const TILTS = ['-0.7deg', '0.6deg', '-0.4deg', '0.8deg'];

export default function CategoryTiles({ categories, limit }) {
  const list = limit ? categories.slice(0, limit) : categories;

  return (
    <div className="cat-grid">
      {list.map((category, index) => {
        const Art = getArt(category.motif);
        const accent = category.accent_color || '#D5233F';
        const hasAisle = Boolean(category.aisle_code);
        return (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            className="cat-tile"
            style={{ '--cat': accent, '--cat-ink': contrastText(accent), '--tilt': TILTS[index % TILTS.length] }}
          >
            <span className="cat-tile__code">
              {hasAisle && <small>ممر</small>}
              <span className="price-num">{hasAisle ? category.aisle_code : String(index + 1).padStart(2, '0')}</span>
            </span>
            <span className="cat-tile__text">
              <span className="cat-tile__name" style={{ display: 'block' }}>{category.name_ar}</span>
              {category.products_count > 0 && (
                <span className="cat-tile__count">{num(category.products_count)} صنف</span>
              )}
            </span>
            <span className="cat-tile__art" aria-hidden="true"><Art className="die-cut" /></span>
          </Link>
        );
      })}
    </div>
  );
}
