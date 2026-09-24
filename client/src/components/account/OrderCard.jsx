import { Link } from 'react-router-dom';
import { IconChevronLeft, IconRefresh } from '@/lib/icons.jsx';
import { money, formatDateTime, ORDER_STATUS_META } from '@/lib/format.js';

/** بطاقة طلب في قائمة «طلباتي» */
export default function OrderCard({ order, onReorder }) {
  const meta = ORDER_STATUS_META[order.status];
  const canReorder = ['delivered', 'cancelled'].includes(order.status);

  return (
    <article className="order-card">
      <div className="order-card__head">
        <div>
          <div className="order-card__num">{order.order_number}</div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
            {order.branch_name} · {formatDateTime(order.placed_at)} · {order.items_count} صنفًا
          </div>
        </div>
        <span className={`status status--${meta?.tone}`}>{meta?.label}</span>
      </div>

      <div className="muted" style={{ fontSize: 'var(--t-sm)' }}>
        {order.preview_items?.map((item) => `${item.name_snapshot} ×${item.quantity}`).join(' · ')}
        {order.items_count > 3 && ` و${order.items_count - 3} أصناف أخرى`}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <strong className="numeral" style={{ fontSize: 'var(--t-md)' }}>{money(order.grand_total)}</strong>

        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          {canReorder && onReorder && (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => onReorder(order.order_number)}>
              <IconRefresh size={14} /> إعادة الطلب
            </button>
          )}
          <Link to={`/account/orders/${order.order_number}`} className="btn btn--primary btn--sm">
            التفاصيل <IconChevronLeft size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
