import Sheet from './Sheet.jsx';

/**
 * تأكيد قبل فعلٍ لا رجعة فيه (إلغاء طلب، إفراغ سلة، رفض إيصال).
 * ورقة سفلية لا نافذة `confirm()` من المتصفّح: تلك تُكسر هوية التطبيق،
 * ولا تسمح بشرح ما سيحدث، وتظهر بلغة الجهاز لا بلغة المتجر.
 */
export default function ConfirmSheet({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'تأكيد', cancelLabel = 'تراجع', tone = 'danger', busy = false, children,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          <button type="button" className="btn btn--outline grow" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn grow ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </>
      )}
    >
      {message && <p className="lede">{message}</p>}
      {children}
    </Sheet>
  );
}
