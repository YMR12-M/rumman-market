/**
 * ═══════════════════════════════════════════════════════════════
 *  صفّ يُسحب جانبيًا للحذف
 *
 *  الإيماءة التي يمدّ إليها مستخدم الهاتف إصبعه أولًا، فيجيبها
 *  التطبيق — لكن لا يكتفي بها أبدًا. كل صفّ من هذه يعرض أيضًا زرّ حذف
 *  تبلغه نقرة، لأن السحب غير مكتشَف، ومستحيل بلوحة المفاتيح، وصعب مع
 *  قارئ الشاشة أو ضعف الحركة. الإيماءة اختصارٌ لمن يعرفها؛ الزرّ هو
 *  الواجهة.
 *
 *  الاتجاه يتبع الكتابة: في العربية يُسحب الصفّ نحو بداية السطر
 *  (يمينًا) فيظهر الحذف عند نهايته (يسارًا) — مرآة ما يفعله تطبيق
 *  إنجليزي بالضبط.
 * ═══════════════════════════════════════════════════════════════
 */
import { useRef, useState } from 'react';
import { IconTrash } from '@/lib/icons.jsx';
import { haptic } from '@/lib/haptics.js';
import { isRtl } from '@/lib/device.js';

/** بعد هذه المسافة يُنفَّذ الحذف عند الإفلات، وقبلها يرتدّ الصفّ */
const COMMIT_DISTANCE = 96;
const MAX_TRAVEL = 132;

export default function SwipeRow({ onDelete, disabled = false, children }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const armed = useRef(false);

  function onTouchStart(event) {
    if (disabled || event.touches.length !== 1) return;
    drag.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      horizontal: null,
      // +1: السحب يمينًا يكشف الحذف (عربي). -1: يسارًا (إنجليزي).
      sign: isRtl() ? 1 : -1,
    };
    armed.current = false;
  }

  function onTouchMove(event) {
    if (!drag.current) return;
    const deltaX = event.touches[0].clientX - drag.current.x;
    const deltaY = event.touches[0].clientY - drag.current.y;

    // نحسم مرّة واحدة، في البكسلات الأولى، لمن هذه الإيماءة: للصفّ أم
    // للصفحة. إعادة الحسم أثناء السحب هي ما يجعل هذه الصفوف تتصارع مع
    // التمرير.
    if (drag.current.horizontal === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      drag.current.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
      if (drag.current.horizontal) setDragging(true);
    }
    if (!drag.current.horizontal) {
      drag.current = null;
      setOffset(0);
      return;
    }

    // في اتجاه واحد، وبحدٍّ صلب كي لا يُقذف الصفّ خارج الشاشة
    const travelled = Math.max(0, Math.min(MAX_TRAVEL, deltaX * drag.current.sign));
    setOffset(travelled * drag.current.sign);

    if (!armed.current && travelled >= COMMIT_DISTANCE) {
      armed.current = true;
      haptic('warn');
    }
  }

  function onTouchEnd() {
    if (!drag.current) return;
    const commit = armed.current;
    drag.current = null;
    armed.current = false;
    setDragging(false);
    setOffset(0);
    if (commit) onDelete();
  }

  return (
    <div className="swipe">
      {/* يظهر خلف الصفّ أثناء سحبه. مخفيّ عن التقنيات المساعدة: الزرّ
          الحقيقي الذي يبلغونه موجود داخل الصفّ نفسه. */}
      <div className="swipe__action" aria-hidden="true">
        <IconTrash size={22} />
      </div>
      <div
        className={`swipe__surface${dragging ? ' is-dragging' : ''}`}
        style={offset ? { translate: `${offset}px 0` } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
