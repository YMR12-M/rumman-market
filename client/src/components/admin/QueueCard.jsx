import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/lib/icons.jsx';
import { money, ORDER_STATUS_META } from '@/lib/format.js';

/** الانتقالات المسموحة — تطابق آلة الحالة في الخادم حرفيًا */
const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
};

/** بطاقة طلب في طابور التجهيز مع أزرار تحريك الحالة */
export default function QueueCard({ order, onAdvance }) {
  const meta = ORDER_STATUS_META[order.status];

  return (
    <article className="order-card">
      <div className="order-card__head">
        <div>
          <Link to={`/account/orders/${order.order_number}`} className="order-card__num link-underline">
            {order.order_number}
          </Link>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
            {order.customer_name} · <span className="numeral">{order.customer_phone}</span> · {order.items_count} صنفًا
            {order.slot_from && ` · موعد ${String(order.slot_from).slice(0, 5)}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
          <span className="muted numeral" style={{ fontSize: 'var(--t-xs)' }}>منذ {order.minutes_waiting} دقيقة</span>
          <span className={`status status--${meta?.tone}`}>{meta?.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <strong className="numeral">
          {money(order.grand_total)} · {order.fulfillment_type === 'delivery' ? 'توصيل' : 'استلام'}
        </strong>

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          {(NEXT_STATUS[order.status] ?? []).map((status) => (
            <button
              key={status}
              type="button"
              className={`btn btn--sm ${status === 'cancelled' ? 'btn--danger' : 'btn--primary'}`}
              onClick={() => onAdvance(order.order_number, status)}
            >
              {status === 'cancelled' ? 'إلغاء' : ORDER_STATUS_META[status]?.label}
              {status !== 'cancelled' && <IconChevronLeft size={13} />}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
