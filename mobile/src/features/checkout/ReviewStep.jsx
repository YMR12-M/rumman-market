import Summary from '@/features/cart/Summary.jsx';
import { addressLine } from './FulfillmentStep.jsx';
import { money, num, paymentLabel } from '@/lib/format.js';

/** الخطوة الأخيرة: كل ما سيُرسل، قبل الالتزام به */
export default function ReviewStep({
  branch, fulfillment, address, slotLabel, payment, cart, pointsValue, deliveryFee, grandTotal, pointsToEarn,
}) {
  return (
    <div className="stack">
      <section className="card card--pad">
        <h2 className="card__title">راجع طلبك</h2>
        <dl className="kv">
          <div className="kv__row"><dt>الفرع</dt><dd>{branch?.name_ar}</dd></div>
          <div className="kv__row"><dt>الاستلام</dt><dd>{fulfillment === 'delivery' ? 'توصيل' : 'من الفرع'}</dd></div>
          {slotLabel && <div className="kv__row"><dt>الموعد</dt><dd>{slotLabel}</dd></div>}
          <div className="kv__row"><dt>الدفع</dt><dd>{paymentLabel(payment)}</dd></div>
        </dl>
        {fulfillment === 'delivery' && address && (
          <p className="text-sm soft" style={{ marginBlockStart: 'var(--s-3)' }}>
            {addressLine(address)}
            <br />
            {address.recipient_name} · <span className="ltr">{address.phone}</span>
          </p>
        )}
      </section>

      <section className="card card--pad">
        <h2 className="card__title">الأصناف (<span className="numeral">{num(cart.items_count)}</span>)</h2>
        <div className="stack--tight">
          {cart.items.map((item) => (
            <div key={item.product_id} className="summary__row">
              <span>{item.name_ar} <span className="muted numeral">×{item.quantity}</span></span>
              <span className="numeral ltr">{money(item.line_total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card card--pad">
        <Summary
          totals={cart.totals}
          couponCode={cart.coupon?.code}
          pointsValue={pointsValue}
          deliveryFee={deliveryFee}
          grandTotal={grandTotal}
        />
        {pointsToEarn > 0 && (
          <p className="text-xs muted" style={{ marginBlockStart: 'var(--s-3)' }}>
            ستكسب نحو <strong className="numeral">{num(pointsToEarn)}</strong> نقطة عند تسليم هذا الطلب.
          </p>
        )}
      </section>
    </div>
  );
}
