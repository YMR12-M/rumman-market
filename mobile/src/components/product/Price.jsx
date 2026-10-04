import { num } from '@/lib/format.js';

/**
 * السعر: الرقم بخطّ الأرقام، والعملة «ج.م» بعده أصغر، والسعر قبل
 * الخصم مشطوبًا إن وُجد. الرقم معزول الاتجاه فلا يعيد السياق العربي
 * ترتيب الفواصل والكسور.
 */
export default function Price({ value, was, large = false }) {
  const now = Number(value ?? 0);
  const before = was ? Number(was) : null;

  return (
    <span className={`price${large ? ' price--lg' : ''}`}>
      <span className="price__now ltr">{num(now)}</span>
      <span className="price__cur">ج.م</span>
      {before && before > now && (
        <span className="price__was ltr">
          <span className="visually-hidden">بدلًا من </span>{num(before)}
        </span>
      )}
    </span>
  );
}
