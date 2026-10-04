/**
 * ═══════════════════════════════════════════════════════════════
 *  الورقة السفلية — نظير النافذة المنبثقة في الواجهة المكتبية
 *
 *  نافذة الهاتف مكانها أسفل الشاشة حيث الإبهام، ويجب أن تُغلق بسحبها
 *  نزولًا: هذه الإيماءة هي طريقة إغلاق كل ورقة أصلية على النظامين،
 *  والورقة التي تتجاهلها تبدو معطوبة ولو كان زرّ الإغلاق أمامها.
 *
 *  الوصولية كما في النافذة المكتبية: التركيز يدخل عند الفتح ويعود
 *  إلى من فتحها عند الإغلاق، وEscape يغلقها، وTab محبوس داخلها. السحب
 *  إضافة لا الطريق الوحيد — زرّ ✕ والخلفية يغلقانها أيضًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from '@/lib/icons.jsx';
import { haptic } from '@/lib/haptics.js';

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** أبعد من هذا، أو أسرع من هذا، وتُغلق الورقة */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55; // بكسل لكل جزء من الثانية

export default function Sheet({ open, onClose, title, children, footer, describedBy }) {
  const sheetRef = useRef(null);
  const previouslyFocused = useRef(null);

  // إزاحة السحب الحيّة بالبكسل. null = لا سحب، فتعمل حركة الفتح بلا تعارض.
  const [offset, setOffset] = useState(null);
  const drag = useRef(null);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = sheetRef.current?.querySelectorAll(FOCUSABLE);
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    // نركّز الورقة نفسها لا أول حقل: فتح لوحة المفاتيح تلقائيًا يغطّي
    // نصف الورقة قبل أن يقرأ المستخدم عنوانها.
    const timer = setTimeout(() => sheetRef.current?.focus({ preventScroll: true }), 0);

    // تجميد الصفحة خلف الورقة. position:fixed لا overflow:hidden لأن Safari
    // في iOS يتجاهل الثانية على <body> ويمرّر الصفحة تحت الورقة المفتوحة.
    const scrollY = window.scrollY;
    const { style } = document.body;
    const saved = { position: style.position, top: style.top, width: style.width };
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';

    return () => {
      clearTimeout(timer);
      style.position = saved.position;
      style.top = saved.top;
      style.width = saved.width;
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // ورقة أُعيد فتحها بعد سحبها يجب أن تبدأ من الأسفل من جديد
  useEffect(() => {
    if (!open) {
      setOffset(null);
      drag.current = null;
    }
  }, [open]);

  function onPointerDown(event) {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, velocity: 0 };
    setOffset(0);
  }

  function onPointerMove(event) {
    if (!drag.current) return;
    const elapsed = event.timeStamp - drag.current.lastTime;
    if (elapsed > 0) {
      drag.current.velocity = (event.clientY - drag.current.lastY) / elapsed;
      drag.current.lastY = event.clientY;
      drag.current.lastTime = event.timeStamp;
    }
    // نزولًا فقط: السحب للأعلى يتوقّف بدل أن يرفع الورقة عن الحافّة
    setOffset(Math.max(0, event.clientY - drag.current.startY));
  }

  function onPointerUp() {
    if (!drag.current) return;
    const { velocity } = drag.current;
    const travelled = offset ?? 0;
    drag.current = null;

    if (travelled > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      haptic('tap');
      onClose();
      return;
    }
    setOffset(0); // لم يكفِ السحب: ترتدّ إلى مكانها
  }

  if (!open) return null;

  const dragging = drag.current !== null;

  return createPortal(
    <>
      <div
        className="sheet-backdrop"
        onPointerDown={(event) => {
          // الضغطة التي تبدأ على الخلفية وحدها تُغلق — لا سحبٌ بدأ داخل حقل
          if (event.target === event.currentTarget) onClose();
        }}
      />
      <div
        className={`sheet${dragging ? ' is-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={describedBy}
        ref={sheetRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={offset ? { translate: `0 ${offset}px` } : undefined}
      >
        <div
          className="sheet__grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          // المقبض زينة تكرّر زرّ الإغلاق، وهو ما تُوجَّه إليه قارئات الشاشة
          aria-hidden="true"
        />

        <header className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <IconClose size={20} />
          </button>
        </header>

        <div className="sheet__body">{children}</div>

        {footer && <footer className="sheet__footer">{footer}</footer>}
      </div>
    </>,
    document.body,
  );
}
