import { Link } from 'react-router-dom';

/**
 * رأس قسم موحّد: عين صغيرة + عنوان + وصف + رابط جانبي اختياري.
 * تكراره في كل الصفحات هو ما يصنع الإيقاع البصري للبراند.
 */
export default function SectionHead({ eyebrow, title, description, actionLabel, actionTo, children }) {
  return (
    <div className="section-head">
      <div className="section-head__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{description}</p>}
      </div>
      {children}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="link-underline" style={{ whiteSpace: 'nowrap', fontSize: 'var(--t-sm)' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
