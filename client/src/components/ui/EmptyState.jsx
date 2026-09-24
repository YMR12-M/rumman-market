import { Link } from 'react-router-dom';
import { BrandMark } from '@/lib/motifs.jsx';

/** حالة فارغة موحّدة — بعلامة البراند بدل رسم عام */
export default function EmptyState({ title, description, actionLabel, actionTo, onAction, icon }) {
  return (
    <div className="empty">
      <div className="empty__mark">{icon ?? <BrandMark size={48} />}</div>
      <h3>{title}</h3>
      {description && <p style={{ maxWidth: '46ch', marginInline: 'auto' }}>{description}</p>}
      {actionLabel && (actionTo ? (
        <Link to={actionTo} className="btn btn--primary" style={{ marginTop: 'var(--s-4)' }}>{actionLabel}</Link>
      ) : (
        <button type="button" className="btn btn--primary" style={{ marginTop: 'var(--s-4)' }} onClick={onAction}>
          {actionLabel}
        </button>
      ))}
    </div>
  );
}
