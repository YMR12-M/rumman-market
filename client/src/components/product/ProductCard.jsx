import { Link } from 'react-router-dom';
import ProductPlate from './ProductPlate.jsx';
import Rating from '@/components/ui/Rating.jsx';
import { Burst } from '@/lib/art.jsx';
import { IconHeart, IconPlus, IconCheck, IconPin } from '@/lib/icons.jsx';
import { money, unitLabel } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';

/** الختم المعروض أعلى اللوحة حسب حالة المنتج (واحد فقط حتى لا تزدحم) */
const BADGES = {
  new:         { label: 'جديد',          className: 'stamp stamp--ink' },
  best_seller: { label: 'الأكثر طلبًا',  className: 'stamp stamp--sun' },
  limited:     { label: 'كمية محدودة',   className: 'stamp' },
  deal:        null, /* نجمة الخصم تغني عنها */
};

/**
 * بطاقة المنتج = تذكرة سوق:
 *   فوق: ملصق المنتج على ورقة بلون قسمه (+ نجمة الخصم والأختام)
 *   وسط: الاسم، ومصدره مكتوبًا (وعد البراند)، والتقييم
 *   تحت خطّ التقطيع: قسيمة السعر بأرقام اللافتات + زرّ الإضافة
 */
export default function ProductCard({ product, delay }) {
  const { addItem, quantityOf } = useCart();
  const wishlist = useWishlist();

  const price = Number(product.effective_price ?? product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const inCart = quantityOf(product.id);
  const outOfStock = product.stock !== undefined && Number(product.stock) <= 0;
  const lowStock = !outOfStock && Number(product.stock) > 0 && Number(product.stock) <= 8;
  const badge = BADGES[product.badge];
  const discount = compareAt ? Math.round((1 - price / compareAt) * 100) : 0;

  /* المصدر على البطاقة؛ وإن لم يُسجَّل نكتفي بسطر المحرّر */
  const source = product.farm_or_maker;

  return (
    <article
      className={`pcard reveal${outOfStock ? ' is-out' : ''}`}
      data-delay={delay}
      style={{ '--cat-accent': product.category_accent }}
    >
      <div className="pcard__media">
        <Link to={`/product/${product.slug}`} aria-label={product.name_ar}>
          <ProductPlate
            name={product.name_ar}
            motif={product.category_motif}
            accent={product.category_accent}
            image={product.image_url}
          />
        </Link>

        {discount > 0 && (
          <Burst size={62} className="pcard__burst">
            وفّر<b>{discount}%</b>
          </Burst>
        )}

        <div className="pcard__flags">
          {badge && <span className={badge.className}>{badge.label}</span>}
          {Boolean(product.is_organic) && <span className="stamp stamp--leaf">عضوي</span>}
        </div>

        {Boolean(product.is_fresh) && !outOfStock && (
          <span className="stamp stamp--leaf stamp--round pcard__fresh">طازج اليوم</span>
        )}

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

        {source ? (
          <p className="pcard__from"><IconPin size={12} /> من {source}</p>
        ) : (
          <p className="pcard__from pcard__from--desc">{product.short_desc_ar}</p>
        )}

        <div className="pcard__meta">
          <Rating value={product.rating_avg} count={product.rating_count} size={11} />
          {outOfStock && <span className="pcard__stock pcard__stock--out">نفد من فرعك</span>}
          {lowStock && <span className="pcard__stock pcard__stock--low">بقي {product.stock} بس!</span>}
          {!lowStock && !outOfStock && Boolean(product.is_exclusive) && (
            <span className="pcard__stock pcard__stock--ex">حصري</span>
          )}
        </div>

        <div className="pcard__perf" aria-hidden="true" />

        <div className="pcard__foot">
          <div className="pcard__price">
            <div className="pcard__price-row">
              <span className="price-num pcard__now">{money(price).replace(' ج.م', '')}</span>
              <span className="pcard__cur">ج.م</span>
              {compareAt && <s className="pcard__was numeral">{Number(compareAt).toLocaleString('en-US')}</s>}
            </div>
            <span className="pcard__unit">/ {product.unit_size || unitLabel(product.unit)}</span>
          </div>

          <button
            type="button"
            className={`pcard__add${inCart > 0 ? ' is-in-cart' : ''}`}
            onClick={() => addItem(product)}
            disabled={outOfStock}
            aria-label={outOfStock ? 'غير متاح' : `أضف ${product.name_ar} إلى السلة`}
            title={inCart ? `في سلتك: ${inCart}` : 'أضف إلى السلة'}
          >
            {inCart > 0 ? <IconCheck size={19} /> : <IconPlus size={19} />}
          </button>
        </div>
      </div>
    </article>
  );
}
