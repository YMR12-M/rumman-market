import { Link } from 'react-router-dom';
import ProductPlate from './ProductPlate.jsx';
import Rating from '@/components/ui/Rating.jsx';
import { IconHeart, IconPlus, IconCheck } from '@/lib/icons.jsx';
import { money, unitLabel } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';

/** الشارة المعروضة أعلى اللوحة حسب حالة المنتج */
/* كل شارة بلونها الخاص حتى تُقرأ بلمحة واحدة وسط الشبكة الملوّنة */
const BADGES = {
  new:         { label: 'جديد',        className: 'badge badge--ink' },
  best_seller: { label: 'الأكثر طلبًا', className: 'badge badge--saffron' },
  limited:     { label: 'كمية محدودة', className: 'badge badge--soft' },
  deal:        null, /* شارة نسبة الخصم تغني عنها */
};

export default function ProductCard({ product, delay }) {
  const { addItem, quantityOf } = useCart();
  const wishlist = useWishlist();

  const price = Number(product.effective_price ?? product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const inCart = quantityOf(product.id);
  const outOfStock = product.stock !== undefined && Number(product.stock) <= 0;
  const lowStock = !outOfStock && Number(product.stock) > 0 && Number(product.stock) <= 8;
  const badge = BADGES[product.badge];

  return (
    <article className="pcard reveal" data-delay={delay} style={{ '--cat-accent': product.category_accent }}>
      <div className="pcard__media">
        <Link to={`/product/${product.slug}`} aria-label={product.name_ar}>
          <ProductPlate
            name={product.name_ar}
            motif={product.category_motif}
            accent={product.category_accent}
            categoryLatin={product.category_slug?.replace('-', ' ') ?? 'RUMMAN'}
          />
        </Link>

        <div className="pcard__flags">
          {compareAt && (
            <span className="badge badge--sale">
              وفّر {Math.round((1 - price / compareAt) * 100)}%
            </span>
          )}
          {badge && <span className={badge.className}>{badge.label}</span>}
          {Boolean(product.is_organic) && <span className="badge badge--organic">عضوي</span>}
        </div>

        <button
          type="button"
          className={`pcard__fav${wishlist.has(product.id) ? ' is-on' : ''}`}
          onClick={() => wishlist.toggle(product)}
          aria-label={wishlist.has(product.id) ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'}
          aria-pressed={wishlist.has(product.id)}
        >
          <IconHeart size={17} filled={wishlist.has(product.id)} />
        </button>
      </div>

      <div className="pcard__body">
        <span className="pcard__cat">{product.category_name}</span>

        <Link to={`/product/${product.slug}`}>
          <h3 className="pcard__name">{product.name_ar}</h3>
        </Link>

        <p className="pcard__desc">{product.short_desc_ar}</p>

        <div className="pcard__meta">
          <Rating value={product.rating_avg} count={product.rating_count} size={12} />
          {lowStock && <span className="pcard__stock pcard__stock--low">بقي {product.stock}</span>}
          {outOfStock && <span className="pcard__stock pcard__stock--out">نفد من فرعك</span>}
          {!lowStock && !outOfStock && Boolean(product.is_exclusive) && (
            <span className="pcard__stock" style={{ color: 'var(--cat-accent)' }}>حصري</span>
          )}
        </div>

        <div className="pcard__foot">
          <div>
            <div className="price">
              <span className="price__now">{money(price).replace(' ج.م', '')}</span>
              <span className="price__cur">ج.م</span>
              {compareAt && <span className="price__was">{Number(compareAt).toLocaleString('en-US')}</span>}
            </div>
            <span className="price__unit">{product.unit_size || unitLabel(product.unit)}</span>
          </div>

          <button
            type="button"
            className={`pcard__add${inCart > 0 ? ' is-in-cart' : ''}`}
            onClick={() => addItem(product)}
            disabled={outOfStock}
            aria-label={outOfStock ? 'غير متاح' : `أضف ${product.name_ar} إلى السلة`}
            title={inCart ? `في سلتك: ${inCart}` : 'أضف إلى السلة'}
          >
            {inCart > 0 ? <IconCheck size={17} /> : <IconPlus size={17} />}
          </button>
        </div>
      </div>
    </article>
  );
}
