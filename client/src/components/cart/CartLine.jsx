import { Link } from 'react-router-dom';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import Stepper from '@/components/ui/Stepper.jsx';
import { IconTrash } from '@/lib/icons.jsx';
import { money } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';

/** سطر واحد في السلة — يعرض التنبيهات (نفاد/كمية غير كافية) بوضوح */
export default function CartLine({ item, onNavigate }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="cart-line">
      <div className="cart-line__media">
        <Link to={`/product/${item.slug}`} onClick={onNavigate}>
          <ProductPlate name={item.name_ar} motif={item.category_motif} accent={item.category_accent} compact />
        </Link>
      </div>

      <div>
        <Link to={`/product/${item.slug}`} onClick={onNavigate}>
          <div className="cart-line__name">{item.name_ar}</div>
        </Link>
        <div className="cart-line__meta">
          {item.unit_size} · {money(item.unit_price)}
        </div>

        {item.issues?.length > 0 && (
          <div className="cart-line__issue">{item.issues[0].message}</div>
        )}

        <div style={{ marginTop: 'var(--s-3)' }}>
          <Stepper
            value={item.quantity}
            min={1}
            max={Math.min(item.max_per_order ?? 20, item.stock ?? 99)}
            onChange={(next) => updateQuantity(item.product_id, next)}
          />
        </div>
      </div>

      <div className="cart-line__actions">
        <strong className="numeral">{money(item.line_total)}</strong>
        <button
          type="button"
          className="icon-btn"
          onClick={() => removeItem(item.product_id)}
          aria-label={`حذف ${item.name_ar}`}
          style={{ width: 32, height: 32 }}
        >
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}
