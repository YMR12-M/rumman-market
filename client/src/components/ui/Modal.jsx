import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from '@/lib/icons.jsx';
import { useEscapeKey, useLockBodyScroll } from '@/hooks/index.js';

/**
 * نافذة وسطية — للنماذج الطويلة في لوحة الإدارة.
 *
 * لماذا لا نستعمل الدرج الجانبي؟ لأن نموذج المنتج فيه ثلاثون حقلًا،
 * وعمود بعرض 450px يجعله شريطًا طويلًا لا يُقرأ. النافذة تعطينا
 * شبكةً من عمودين.
 *
 * الوصولية: نحبس التركيز داخل النافذة ونعيده إلى الزرّ الذي فتحها،
 * فمن يتنقّل بلوحة المفاتيح لا يجد نفسه يتنقّل في الصفحة المحجوبة.
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);

  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;

    const panel = panelRef.current;
    const focusable = panel?.querySelector(
      'input:not([type="hidden"]):not([disabled]), select, textarea, button, [href]',
    );
    focusable?.focus();

    const trap = (event) => {
      if (event.key !== 'Tab' || !panel) return;

      const items = [...panel.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]',
      )].filter((node) => node.offsetParent !== null);

      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="modal-wrap" role="presentation">
        <div
          ref={panelRef}
          className={`modal modal--${size}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header className="modal__head">
            <div>
              <h3 className="modal__title">{title}</h3>
              {subtitle && <p className="modal__sub">{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
              <IconClose size={20} />
            </button>
          </header>

          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__foot">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  );
}

/** تأكيد إجراء لا يُستردّ — بديلٌ عن window.confirm بهوية الموقع */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد', danger = true, busy = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'جارٍ التنفيذ…' : confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>تراجع</button>
        </>
      }
    >
      <p style={{ fontSize: 'var(--t-sm)', lineHeight: 'var(--lh-snug)' }}>{message}</p>
    </Modal>
  );
}
