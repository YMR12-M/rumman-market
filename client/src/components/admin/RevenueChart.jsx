import { useMemo } from 'react';
import { money, num, formatDate } from '@/lib/format.js';

/**
 * منحنى الإيراد اليومي كأعمدة.
 *
 * نرسمه بـ CSS فقط بلا مكتبة رسوم — البيانات قيمةٌ لكل يوم، وإضافة
 * مكتبة كاملة لأجلها كلفة بلا مقابل.
 *
 * القرار المهمّ هنا: **نملأ الأيام الغائبة بأصفار**. الخادم يرجع
 * صفوف الأيام التي فيها بيع فقط، فيوم واحد يعني عمودًا يملأ العرض
 * كلّه — وهو ليس «رسمًا بيانيًا» بل كتلة لون مضلّلة. بملء الفراغات
 * يقرأ المشاهد الحقيقة: يومٌ واحد فيه بيع وسط شهر هادئ.
 */
export default function RevenueChart({ data = [], days = 30 }) {
  const series = useMemo(() => {
    const byDay = new Map(
      data.map((row) => [String(row.day).slice(0, 10), { revenue: Number(row.revenue), orders: Number(row.orders) }]),
    );

    const today = new Date();
    const points = [];

    for (let back = days - 1; back >= 0; back -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - back);
      const key = date.toISOString().slice(0, 10);
      const found = byDay.get(key);
      points.push({ day: key, revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 });
    }

    return points;
  }, [data, days]);

  const max = Math.max(...series.map((point) => point.revenue), 1);
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  const best = series.reduce((top, point) => (point.revenue > top.revenue ? point : top), series[0] ?? { revenue: 0 });

  return (
    <div className="panel">
      <div className="panel__head">
        <div>
          <h3 className="panel__title">الإيراد اليومي</h3>
          <p className="muted" style={{ fontSize: 'var(--t-xs)', margin: 0 }}>
            آخر {num(days)} يومًا · مرّر فوق أي عمود لتفاصيله
          </p>
        </div>
        {total > 0 && (
          <div style={{ textAlign: 'start' }}>
            <div className="numeral" style={{ fontSize: 'var(--t-md)', fontWeight: 600 }}>{money(total)}</div>
            {best.revenue > 0 && (
              <div className="cell-sub">أعلى يوم: {money(best.revenue)}</div>
            )}
          </div>
        )}
      </div>

      <div className="chart" role="img" aria-label={`إيراد آخر ${days} يومًا، الإجمالي ${money(total)}`}>
        {series.map((point) => (
          <div
            key={point.day}
            className={`chart__bar${point.revenue === 0 ? ' is-empty' : ''}`}
            style={{ height: point.revenue === 0 ? '3px' : `${Math.max(6, (point.revenue / max) * 100)}%` }}
            title={
              point.revenue === 0
                ? `${formatDate(point.day)} — لا مبيعات`
                : `${formatDate(point.day)} — ${money(point.revenue)} · ${num(point.orders)} طلبًا`
            }
          />
        ))}
      </div>
    </div>
  );
}
