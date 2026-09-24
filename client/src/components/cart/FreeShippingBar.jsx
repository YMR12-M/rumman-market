import { money } from '@/lib/format.js';
import { IconTruck } from '@/lib/icons.jsx';

/**
 * شريط تقدّم نحو التوصيل المجاني.
 * يرفع متوسط قيمة الطلب لأنه يعطي العميل هدفًا ملموسًا وقريبًا.
 */
export default function FreeShippingBar({ totals }) {
  const remaining = Number(totals.amount_to_free_delivery ?? 0);
  const target = remaining + Number(totals.subtotal ?? 0);
  const progress = target > 0 ? Math.min(100, (Number(totals.subtotal) / target) * 100) : 100;

  return (
    <div className="free-ship-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', fontSize: 'var(--t-xs)', marginBottom: 6 }}>
        <IconTruck size={15} style={{ color: 'var(--brand-text)' }} />
        {totals.free_delivery_applied || remaining <= 0 ? (
          <span style={{ color: 'var(--success)' }}>التوصيل مجاني على هذا الطلب</span>
        ) : (
          <span>أضِف بقيمة <strong className="numeral">{money(remaining)}</strong> ليصبح التوصيل مجانيًا</span>
        )}
      </div>
      <div className="free-ship-bar__track">
        <div className="free-ship-bar__fill" style={{ width: `${totals.free_delivery_applied ? 100 : progress}%` }} />
      </div>
    </div>
  );
}
