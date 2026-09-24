import { money } from '@/lib/format.js';

/** الإيراد حسب القسم — كل شريط بلون قسمه القادم من قاعدة البيانات */
export default function CategoryBars({ data = [], limit = 10 }) {
  const max = Math.max(...data.map((row) => Number(row.revenue)), 1);

  return (
    <div className="panel">
      <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>الإيراد حسب القسم</h3>

      <div className="bar-list">
        {data.slice(0, limit).map((row) => (
          <div className="bar-list__row" key={row.category}>
            <span style={{ fontSize: 'var(--t-xs)' }}>{row.category}</span>
            <div className="bar-list__track">
              <div
                className="bar-list__fill"
                style={{ width: `${(Number(row.revenue) / max) * 100}%`, background: row.color || 'var(--brand)' }}
              />
            </div>
            <span className="numeral" style={{ fontSize: 'var(--t-xs)' }}>{money(row.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
