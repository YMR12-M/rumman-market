import { IconChevronRight, IconChevronLeft } from '@/lib/icons.jsx';

/**
 * ترقيم مختصر: يعرض أول صفحة وآخر صفحة والصفحات المجاورة فقط،
 * مع «…» بينها — يبقى مقروءًا حتى مع مئة صفحة.
 */
export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  for (let candidate = 1; candidate <= totalPages; candidate += 1) {
    const isEdge = candidate === 1 || candidate === totalPages;
    const isNear = Math.abs(candidate - page) <= 1;
    if (isEdge || isNear) pages.push(candidate);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <nav className="pagination" aria-label="تنقّل بين الصفحات">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="السابق">
        <IconChevronRight size={16} />
      </button>

      {pages.map((item, index) => (item === '…' ? (
        <span key={`gap-${index}`} className="muted" style={{ padding: '0 4px' }}>…</span>
      ) : (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-current={item === page ? 'page' : undefined}
        >
          {item}
        </button>
      )))}

      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="التالي">
        <IconChevronLeft size={16} />
      </button>
    </nav>
  );
}
