/**
 * تنبيهات عابرة (Toasts).
 * تُستخدم لتأكيد الإجراءات القصيرة بدل نوافذ التنبيه المزعجة.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { IconCheck, IconClose, IconInfo } from '@/lib/icons.jsx';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone = 'info', duration = 3200) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => dismiss(id), duration);
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
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="إغلاق">
              <IconClose size={16} />
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
