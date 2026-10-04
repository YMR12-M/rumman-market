import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductPlate from './ProductPlate.jsx';
import { Burst } from '@/lib/art.jsx';
import Price from './Price.jsx';
import QtyControl from '@/components/ui/QtyControl.jsx';
import { IconHeart, IconPlus } from '@/lib/icons.jsx';
import { unitLabel } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';

/**
 * ═══════════════════════════════════════════════════════════════
 *  بطاقة المنتج في الشبكة والشرائط
 *
 *  زرّ الإضافة يتحوّل إلى ضابط كمية بمجرّد أن يدخل الصنف السلة: من
 *  يضيف طماطم يريد غالبًا كيلوين لا واحدًا، ويجب ألّا يضطر لفتح صفحة
 *  المنتج أو السلة ليرفع الكمية.
 *
 *  الكمية القصوى هي الأقلّ من حدّ الطلب ومخزون الفرع — القاعدة نفسها
 *  التي يطبّقها الخادم، فلا يُفاجأ العميل برفض عند الدفع.
 * ═══════════════════════════════════════════════════════════════
 */

/** أختام الحالة — نفس دلالات الواجهة المكتبية (ختم واحد فقط حتى لا تزدحم) */
const BADGES = {
  new: { label: 'جديد', className: 'stamp stamp--ink' },
  best_seller: { label: 'الأكثر طلبًا', className: 'stamp stamp--sun' },
  limited: { label: 'كمية محدودة', className: 'stamp' },
};

export default function ProductTile({ product }) {
  const { addItem, updateQuantity, removeItem, quantityOf } = useCart();
  const wishlist = useWishlist();
  const [busy, setBusy] = useState(false);

  const price = Number(product.effective_price ?? product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const stock = product.stock === undefined || product.stock === null ? null : Number(product.stock);
  const outOfStock = stock !== null && stock <= 0;
  const lowStock = stock !== null && stock > 0 && stock <= 8;
  const inCart = quantityOf(product.id);
  const maxQty = Math.min(product.max_per_order ?? 20, stock ?? Infinity);
  const badge = BADGES[product.badge];
  const favorite = wishlist.has(product.id);
  const discount = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

  const run = async (action) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  return (
    <article className={`ptile${outOfStock ? ' is-out' : ''}`}>
      <div className="ptile__top">
        <Link to={`/product/${product.slug}`} className="ptile__media" aria-label={product.name_ar}>
          <ProductPlate
            name={product.name_ar}
            motif={product.category_motif}
            accent={product.category_accent}
            image={product.image_url}
          />
        </Link>

        {discount > 0 && (
          <Burst size={54} className="ptile__burst">
            وفّر<b>{discount}%</b>
          </Burst>
        )}

        <div className="ptile__flags">
          {badge && <span className={badge.className}>{badge.label}</span>}
          {Boolean(product.is_organic) && <span className="stamp stamp--leaf">عضوي</span>}
        </div>

        {Boolean(product.is_fresh) && !outOfStock && (
          <span className="stamp stamp--leaf stamp--round ptile__fresh">طازج اليوم</span>
        )}

        <button
          type="button"
          className={`ptile__fav${favorite ? ' is-on' : ''}`}
          onClick={() => wishlist.toggle(product)}
          aria-label={favorite ? `إزالة ${product.name_ar} من المفضّلة` : `إضافة ${product.name_ar} إلى المفضّلة`}
          aria-pressed={favorite}
        >
          <span><IconHeart size={16} filled={favorite} /></span>
        </button>
      </div>

      <div className="ptile__body">
        {product.category_name && <span className="ptile__cat">{product.category_name}</span>}
        <Link to={`/product/${product.slug}`}>
          <h3 className="ptile__name">{product.name_ar}</h3>
        </Link>
        <span className="ptile__unit">{product.farm_or_maker ? `من ${product.farm_or_maker}` : (product.unit_size || unitLabel(product.unit))}</span>
        {outOfStock && <span className="ptile__stock">نفد من فرعك</span>}
        {lowStock && <span className="ptile__stock">بقي {stock} بس!</span>}

        <div className="ptile__perf" aria-hidden="true" />

        <div className="ptile__foot">
          <Price value={price} was={compareAt} />

          {inCart > 0 ? (
            <QtyControl
              compact
              value={inCart}
              max={maxQty}
              busy={busy}
              label={`كمية ${product.name_ar}`}
              onChange={(quantity) => run(() => updateQuantity(product.id, quantity))}
              onRemove={() => run(() => removeItem(product.id))}
            />
          ) : (
            <button
              type="button"
              className="ptile__add"
              onClick={() => run(() => addItem(product))}
              disabled={outOfStock || busy}
              aria-label={outOfStock ? `${product.name_ar} غير متاح` : `أضف ${product.name_ar} إلى السلة`}
            >
              <IconPlus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
