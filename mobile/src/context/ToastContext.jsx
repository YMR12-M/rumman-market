/**
 * ═══════════════════════════════════════════════════════════════
 *  التنبيهات العابرة — نسخة الجوّال
 *
 *  الواجهة البرمجية مطابقة لنسخة الواجهة المكتبية حرفيًا
 *  (`toast` و`success` و`error`)، لأن السياقات المشتركة — السلة
 *  والمفضّلة — تستدعيها كما هي. الذي يختلف هو المكان والشكل:
 *  تظهر فوق شريط التبويبات حيث تقع العين والإبهام، وتصحبها لمسة
 *  اهتزاز خفيفة عند النجاح أو الخطأ.
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { IconCheck, IconClose, IconInfo } from '@/lib/icons.jsx';
import { haptic } from '@/lib/haptics.js';

const ToastContext = createContext(null);
let nextId = 1;

/** أقصى عدد ظاهر معًا — ما زاد يُسقط الأقدم كي لا تغطّي الشاشة */
const MAX_VISIBLE = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone = 'info', duration = 3200) => {
    if (!message) return;
    const id = nextId++;
    setToasts((current) => [...current, { id, message, tone }].slice(-MAX_VISIBLE));
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
    if (tone === 'success') haptic('success');
    if (tone === 'error') haptic('warn');
  }, [dismiss]);

  const value = useMemo(() => ({
    toast: push,
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error', 4200),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.tone === 'success' ? <IconCheck size={18} /> : <IconInfo size={18} />}
            <span className="grow">{toast.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="إغلاق التنبيه">
              <IconClose size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast يجب أن يُستخدم داخل ToastProvider');
  return context;
};
