import { useId } from 'react';
import { IconChevronDown } from '@/lib/icons.jsx';

/**
 * حقل نموذج موحّد: عنوان، أداة إدخال، تلميح أو خطأ.
 *
 * `as` يحدّد الأداة (input | select | textarea). رسالة الخطأ مربوطة
 * بالحقل عبر aria-describedby فيقرؤها قارئ الشاشة مع الحقل نفسه، لا
 * كنصٍّ عائم تحته. و`dir="ltr"` للحقول اللاتينية (بريد، هاتف، كود)
 * كي لا يعيد اتجاه النصّ ترتيب ما يُكتب فيها.
 */
export default function Field({
  label, name, as = 'input', error, hint, required = false, children, className = '', ...props
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Control = as;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
      )}

      <div className="field__control">
        <Control
          id={id}
          name={name}
          className="input"
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </Control>
        {as === 'select' && (
          <span className="field__chevron" aria-hidden="true"><IconChevronDown size={18} /></span>
        )}
      </div>

      {error
        ? <span className="field__error" id={`${id}-error`} role="alert">{error}</span>
        : hint && <span className="field__hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  );
}
