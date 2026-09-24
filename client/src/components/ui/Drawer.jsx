import { createPortal } from 'react-dom';
import { IconClose } from '@/lib/icons.jsx';
import { useEscapeKey, useLockBodyScroll } from '@/hooks/index.js';

/**
 * درج جانبي عام (سلة، فلاتر، قائمة موبايل).
 * يُغلق بـ Escape أو بالنقر على الحاجب، ويمنع تمرير الخلفية.
 */
export default function Drawer({ open, onClose, title, children, footer }) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);

  if (!open) return null;

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer__head">
          <h3 style={{ fontSize: 'var(--t-md)' }}>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <IconClose size={20} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
