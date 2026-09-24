import { money, num, percent } from '@/lib/format.js';

/** مؤشّرات الأداء الأربعة مع نسبة النمو مقارنةً بالفترة السابقة */
export default function KpiGrid({ kpis }) {
  const items = [
    { label: 'الإيرادات',          value: money(kpis?.revenue ?? 0),            growth: kpis?.revenue_growth },
    { label: 'عدد الطلبات',        value: num(kpis?.orders ?? 0),               growth: kpis?.orders_growth },
    { label: 'متوسّط قيمة الطلب', value: money(kpis?.avg_order_value ?? 0),    growth: null },
    { label: 'عملاء نشطون',        value: num(kpis?.customers ?? 0),            growth: null },
  ];

  return (
    <div className="stat-grid">
      {items.map(({ label, value, growth }) => (
        <div className="stat" key={label}>
          <span className="stat__label">{label}</span>
          <div className="stat__value">{value}</div>
          {growth != null && (
            <div className={`stat__delta stat__delta--${growth >= 0 ? 'up' : 'down'}`}>
              {growth >= 0 ? '▲' : '▼'} {percent(Math.abs(growth))} مقارنةً بالفترة السابقة
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
