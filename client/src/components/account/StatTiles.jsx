/**
 * صفّ مربّعات الأرقام السريعة.
 * يقبل مصفوفة {label, value, note, icon, color} فيصلح لأي سياق
 * (لوحة العميل، صفحة النقاط، لوحة الإدارة).
 */
export default function StatTiles({ items }) {
  return (
    <div className="stat-grid">
      {items.map(({ label, value, note, icon: Icon, color }) => (
        <div className="stat" key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-2)' }}>
            <span className="stat__label">{label}</span>
            {Icon && <Icon size={18} style={{ color: color || 'var(--brand)' }} />}
          </div>
          <div className="stat__value">{value}</div>
          {note && <div className="stat__delta muted">{note}</div>}
        </div>
      ))}
    </div>
  );
}
