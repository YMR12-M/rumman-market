/**
 * جدول بيانات موحّد للوحة الإدارة.
 *
 * لماذا مكوّن واحد لكل الجداول؟ لأن اللوحة تعرض تسعة كيانات، وتكرار
 * بنية الجدول تسع مرّات يعني تسع فرص لاختلاف سلوك الفراغ أو التحميل
 * أو تمرير الجدول أفقيًا على الموبايل.
 *
 * الأعمدة تُوصَف تصريحيًا:
 *   [{ key, label, render?, align?, width?, hideOnMobile? }]
 */
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';

export default function DataTable({
  columns,
  rows = [],
  loading = false,
  rowKey = (row, index) => row.id ?? index,
  onRowClick,
  empty = { title: 'لا توجد بيانات بعد', description: 'ابدأ بإضافة أول عنصر.' },
  footer,
}) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} height={52} />)}
      </div>
    );
  }

  // نمرّر الكائن كما هو حتى تمرّ خصائص الإجراء (actionLabel/onAction/actionTo)
  if (rows.length === 0) return <EmptyState {...empty} />;

  return (
    <>
      <div className="table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.hideOnMobile ? 'is-optional' : undefined}
                  style={{ textAlign: column.align || 'start', width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'is-clickable' : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.hideOnMobile ? 'is-optional' : undefined}
                    style={{ textAlign: column.align || 'start' }}
                  >
                    {column.render ? column.render(row, index) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
