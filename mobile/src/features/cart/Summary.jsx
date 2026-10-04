import { money } from '@/lib/format.js';

/**
 * الملخّص المالي — يُستخدم في السلة والدفع والطلب.
 * كل رقم هنا من الخادم (أو محسوب بقواعده في سلة الزائر)؛ الواجهة
 * تعرض ولا تحسب سعرًا.
 */
export default function Summary({ totals, couponCode, pointsValue = 0, deliveryFee, grandTotal }) {
  const delivery = deliveryFee ?? totals.delivery_fee;
  const total = grandTotal ?? totals.grand_total;

  return (
    <div className="summary">
      <div className="summary__row"><span>المجموع الفرعي</span><span className="numeral ltr">{money(totals.subtotal)}</span></div>
      {Number(totals.discount_total) > 0 && (
        <div className="summary__row summary__row--discount">
          <span>خصم{couponCode ? <> <span className="ltr">{couponCode}</span></> : null}</span>
          <span className="numeral ltr">−{money(totals.discount_total)}</span>
        </div>
      )}
      {Number(pointsValue) > 0 && (
        <div className="summary__row summary__row--discount">
          <span>نقاط الولاء</span><span className="numeral ltr">−{money(pointsValue)}</span>
        </div>
      )}
      <div className="summary__row">
        <span>التوصيل</span>
        <span className={Number(delivery) > 0 ? 'numeral ltr' : 'text-success'}>{Number(delivery) > 0 ? money(delivery) : 'مجاني'}</span>
      </div>
      {Number(totals.tax_total) > 0 && (
        <div className="summary__row"><span>ضريبة القيمة المضافة</span><span className="numeral ltr">{money(totals.tax_total)}</span></div>
      )}
      <div className="summary__row summary__row--total"><span>الإجمالي</span><span className="numeral ltr">{money(total)}</span></div>
    </div>
  );
}
