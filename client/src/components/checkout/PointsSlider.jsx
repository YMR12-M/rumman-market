import { IconGift } from '@/lib/icons.jsx';
import { money, num } from '@/lib/format.js';

/**
 * استبدال نقاط الولاء.
 * الحد الأقصى يحسبه الأب (الرصيد أو نصف قيمة السلة — أيّهما أقل)
 * بنفس القاعدة المطبّقة في الخادم، فلا يفاجأ العميل برفض عند التأكيد.
 */
export default function PointsSlider({ balance, maxPoints, value, onChange, pointsValue }) {
  if (!maxPoints) return null;

  return (
    <div className="panel">
      <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconGift size={20} style={{ color: 'var(--brand)' }} /> نقاط الولاء
      </h3>

      <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
        لديك <strong className="numeral">{num(balance)}</strong> نقطة.
        يمكنك استخدام حتى <strong className="numeral">{num(maxPoints)}</strong> نقطة في هذا الطلب
        (بما لا يتجاوز نصف قيمة السلة).
      </p>

      <input
        type="range"
        min="0"
        max={maxPoints}
        step="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand)', marginBlock: 'var(--s-4)' }}
        aria-label="عدد النقاط المستخدمة"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-sm)' }}>
        <span className="numeral">{num(value)} نقطة</span>
        <strong className="numeral" style={{ color: 'var(--success)' }}>−{money(pointsValue)}</strong>
      </div>
    </div>
  );
}
