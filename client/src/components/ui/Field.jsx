/**
 * حقل نموذج موحّد: تسمية + إدخال + رسالة خطأ.
 * وجود كل ذلك في مكوّن واحد يضمن اتساق النماذج وسهولة الوصول
 * (ربط aria-invalid و aria-describedby تلقائيًا).
 */
export default function Field({
  label, name, type = 'text', error, hint, required,
  as = 'input', children, ...props
}) {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const Element = as;
  const className = as === 'select' ? 'select' : as === 'textarea' ? 'textarea' : 'input';

  return (
    <label className={`field${error ? ' has-error' : ''}`} htmlFor={inputId}>
      {label && (
        <span className="field__label">
          {label} {required && <span aria-hidden="true">*</span>}
        </span>
      )}

      <Element
        id={inputId}
        name={name}
        type={as === 'input' ? type : undefined}
        className={className}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {children}
      </Element>

      {error && <span className="field__error" id={errorId} role="alert">{error}</span>}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
