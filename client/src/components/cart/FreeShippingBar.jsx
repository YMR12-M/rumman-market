import { money } from '@/lib/format.js';
import { IconTruck } from '@/lib/icons.jsx';

/**
 * شريط تقدّم نحو التوصيل المجاني: طريقٌ تقطعه شاحنة.
 * يرفع متوسط قيمة الطلب لأنه يعطي العميل هدفًا ملموسًا وقريبًا.
 */
export default function FreeShippingBar({ totals }) {
  const remaining = Number(totals.amount_to_free_delivery ?? 0);
  const target = remaining + Number(totals.subtotal ?? 0);
  const done = totals.free_delivery_applied || remaining <= 0;
  const progress = done ? 100 : target > 0 ? Math.min(100, (Number(totals.subtotal) / target) * 100) : 100;

  return (
    <div className="free-ship-bar">
      <div style={{ fontSize: 'var(--t-xs)', fontWeight: 700, marginBottom: 'var(--s-4)' }}>
        {done ? (
          <span style={{ color: 'var(--success-text)' }}>التوصيل مجاني على هذا الطلب</span>
        ) : (
          <span>أضِف بقيمة <strong className="numeral">{money(remaining)}</strong> ليصبح التوصيل مجانيًا</span>
        )}
      </div>
      <div className="free-ship-bar__track">
        <div className="free-ship-bar__fill" style={{ width: `${progress}%` }} />
        <span className="free-ship-bar__truck" style={{ insetInlineStart: `${progress}%` }}>
          <IconTruck size={15} />
        </span>
      </div>
    </div>
  );
}
