import { Link } from 'react-router-dom';
import ProductPlate from './ProductPlate.jsx';
import { money, unitLabel } from '@/lib/format.js';

/**
 * صفّ منتج أفقي مضغوط — لنتائج البحث حيث السرعة أهم من المساحة.
 * `onSelect` يُستدعى قبل الانتقال (لحفظ عبارة البحث مثلًا).
 */
export default function ProductRow({ product, onSelect }) {
  return (
    <Link to={`/product/${product.slug}`} className="prow" onClick={onSelect}>
      <span className="prow__media">
        <ProductPlate name={product.name_ar} motif={product.category_motif} accent={product.category_accent} compact />
      </span>
      <span className="prow__body">
        <span className="prow__name">{product.name_ar}</span>
        <span className="prow__meta">
          {[product.category_name, product.unit_size || unitLabel(product.unit)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="prow__price ltr">{money(product.effective_price ?? product.price)}</span>
    </Link>
  );
}
