import { Link } from 'react-router-dom';

/**
 * رأس قسم موحّد: ملاحظة بخط اليد + عنوان + وصف + رابط جانبي اختياري.
 * بينهما خطّ نقاط كسطر في قائمة أسعار («عنوان ........ رابط»).
 * تكراره في كل الصفحات هو ما يصنع الإيقاع البصري للبراند.
 *
 * `tone="dark"` للأسطح الداكنة الملوّنة (مثل شريط العروض الأحمر).
 */
export default function SectionHead({ eyebrow, title, description, actionLabel, actionTo, children, tone }) {
  const dark = tone === 'dark';

  return (
    <div className={`section-head${dark ? ' section-head--onDark' : ''}`}>
      <div className="section-head__text">
        {eyebrow && <span className={`eyebrow${dark ? ' eyebrow--onDark' : ''}`}>{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{description}</p>}
      </div>
      <span className="section-head__fill" aria-hidden="true" />
      {children}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="link-underline" style={{ whiteSpace: 'nowrap', fontSize: 'var(--t-sm)' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
