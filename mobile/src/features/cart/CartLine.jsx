import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import SwipeRow from '@/components/ui/SwipeRow.jsx';
import QtyControl from '@/components/ui/QtyControl.jsx';
import { IconTrash } from '@/lib/icons.jsx';
import { money, unitLabel } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';

/**
 * سطر في السلة: يُسحب للحذف، ومعه زرّ حذف حقيقي لمن لا يعرف الإيماءة.
 * تنبيهات الصنف (نفد، الكمية أكبر من المتاح، تجاوز حدّ الطلب) تأتي من
 * الخادم نصًّا جاهزًا، فتُعرض كما هي تحت اسم الصنف.
 */
export default function CartLine({ item }) {
  const { updateQuantity, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  const remove = () => run(() => removeItem(item.product_id));
  const issues = item.issues ?? [];

  return (
    <SwipeRow onDelete={remove} disabled={busy}>
      <div className="cline">
        <Link to={item.slug ? `/product/${item.slug}` : '#'} aria-label={item.name_ar}>
          <ProductPlate name={item.name_ar} motif={item.category_motif} accent={item.category_accent} compact />
        </Link>

        <div style={{ minWidth: 0 }}>
          <div className="row row--between" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <Link to={item.slug ? `/product/${item.slug}` : '#'} className="cline__name">{item.name_ar}</Link>
              <div className="cline__meta">
                {item.unit_size || unitLabel(item.unit)} · <span className="ltr">{money(item.unit_price)}</span>
              </div>
              {issues.map((issue) => (
                <div key={issue.type ?? issue.message} className="cline__issue" role="alert">{issue.message}</div>
              ))}
            </div>
            <button type="button" className="icon-btn icon-btn--danger" onClick={remove} disabled={busy} aria-label={`حذف ${item.name_ar} من السلة`}>
              <IconTrash size={18} />
            </button>
          </div>

          <div className="cline__foot">
            <QtyControl
              compact
              value={item.quantity}
              min={1}
              max={item.max_per_order ?? 20}
              busy={busy}
              label={`كمية ${item.name_ar}`}
              onChange={(quantity) => run(() => updateQuantity(item.product_id, quantity))}
              onRemove={remove}
            />
            <span className="cline__total ltr">{money(item.line_total)}</span>
          </div>
        </div>
      </div>
    </SwipeRow>
  );
}
