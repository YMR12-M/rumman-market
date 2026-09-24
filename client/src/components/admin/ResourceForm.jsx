/**
 * ═══════════════════════════════════════════════════════════════
 *  نموذج موصوف تصريحيًا
 *
 *  اللوحة تحرّر تسعة كيانات ببنية حقول متباينة. كتابة تسعة نماذج
 *  يدويًا يعني تسع نسخ من: إدارة الحالة، عرض خطأ الحقل، تجميع
 *  الحقول في مجموعات، وحالة الإرسال.
 *
 *  فبدل ذلك نصف الحقول كبيانات:
 *
 *    [{ name, label, type, required, hint, options, span, group }]
 *
 *  والخطأ من الخادم يأتي في `errors` مفاتيحُه أسماء الحقول — فيظهر
 *  كل خطأ تحت حقله بلا ربط يدوي.
 * ═══════════════════════════════════════════════════════════════
 */
import { useEffect, useMemo, useState } from 'react';
import Field from '@/components/ui/Field.jsx';

/** القيمة الابتدائية لكل نوع حقل */
function blankFor(field) {
  if (field.type === 'switch') return field.default ?? false;
  if (field.type === 'number') return field.default ?? '';
  /**
   * القائمة تبدأ فارغة دائمًا — لا نختار أول خيار تلقائيًا.
   * السبب علّة حقيقية: خيارات القوائم تُحمَّل من الخادم بعد أول رسم،
   * فلو اخترنا «أول خيار» وقت الرسم لكانت القائمة فارغة وقتها،
   * ثم يعرض المتصفّح أول خيارٍ وصل بينما القيمة المخزّنة ما زالت
   * فارغة — فيرى المستخدم قسمًا مختارًا ويُرفض حفظه.
   */
  if (field.type === 'select') return field.default ?? '';
  if (field.type === 'tags') return field.default ?? '';
  return field.default ?? '';
}

/** تحويل قيمة قادمة من الخادم إلى ما يقبله عنصر الإدخال */
function toInput(field, value) {
  if (value === null || value === undefined) return blankFor(field);
  if (field.type === 'switch') return Boolean(Number(value)) || value === true;
  if (field.type === 'tags') return Array.isArray(value) ? value.join('، ') : String(value);
  if (field.type === 'time') return String(value).slice(0, 5);
  if (field.type === 'date') return String(value).slice(0, 10);
  if (field.type === 'datetime') {
    // MySQL DATETIME → القيمة التي يقبلها <input type="datetime-local">
    const iso = new Date(value);
    if (Number.isNaN(iso.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${iso.getFullYear()}-${pad(iso.getMonth() + 1)}-${pad(iso.getDate())}T${pad(iso.getHours())}:${pad(iso.getMinutes())}`;
  }
  return String(value);
}

/** تحويل قيمة الإدخال إلى ما يرسله الـ API */
function toPayload(field, value) {
  if (field.type === 'switch') return Boolean(value);
  if (field.type === 'number') return value === '' ? null : Number(value);
  if (field.type === 'tags') {
    const items = String(value).split(/[،,]/).map((item) => item.trim()).filter(Boolean);
    return items.length ? items : null;
  }
  if (field.type === 'datetime') return value === '' ? null : String(value).replace('T', ' ') + ':00';
  if (value === '') return field.emptyAsNull === false ? '' : null;
  return value;
}

export default function ResourceForm({
  fields,
  initial = null,
  errors = {},
  busy = false,
  submitLabel = 'حفظ',
  onSubmit,
  onCancel,
  extra,
}) {
  const [values, setValues] = useState(() => {
    const state = {};
    for (const field of fields) {
      state[field.name] = initial ? toInput(field, initial[field.name]) : blankFor(field);
    }
    return state;
  });

  // إعادة التعبئة عند تبديل العنصر المحرَّر (من صفّ إلى صفّ في الجدول)
  useEffect(() => {
    const state = {};
    for (const field of fields) {
      state[field.name] = initial ? toInput(field, initial[field.name]) : blankFor(field);
    }
    setValues(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const field of fields) {
      const key = field.group || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(field);
    }
    return [...map.entries()];
  }, [fields]);

  const set = (name) => (event) => {
    const target = event.target;
    setValues((previous) => ({
      ...previous,
      [name]: target.type === 'checkbox' ? target.checked : target.value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    const payload = {};
    for (const field of fields) {
      if (field.readOnly) continue;
      const value = toPayload(field, values[field.name]);
      // لا نرسل حقلًا فارغًا اختياريًا في الإنشاء — ليعمل افتراضي الخادم
      if (value === null && !initial && !field.required) continue;
      payload[field.name] = value;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} noValidate className="res-form">
      {groups.map(([group, groupFields]) => (
        <fieldset key={group || 'main'} className="res-form__group" disabled={busy}>
          {group && <legend className="res-form__legend">{group}</legend>}

          <div className="res-form__grid">
            {groupFields.map((field) => (
              <div
                key={field.name}
                className="res-form__cell"
                style={{ gridColumn: `span ${field.span || 6}` }}
              >
                {field.type === 'switch' ? (
                  <label className="checkbox res-form__switch">
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={Boolean(values[field.name])}
                      onChange={set(field.name)}
                    />
                    <span>
                      {field.label}
                      {field.hint && <span className="field__hint">{field.hint}</span>}
                    </span>
                  </label>
                ) : field.type === 'select' ? (
                  <Field
                    as="select"
                    label={field.label}
                    name={field.name}
                    required={field.required}
                    hint={field.hint}
                    error={errors[field.name]}
                    value={values[field.name]}
                    onChange={set(field.name)}
                  >
                    <option value="" disabled={field.required}>
                      {field.required ? '— اختر —' : '— بلا تحديد —'}
                    </option>
                    {(field.options ?? []).map((option) => (
                      <option key={String(option.value)} value={option.value}>{option.label}</option>
                    ))}
                  </Field>
                ) : field.type === 'textarea' ? (
                  <Field
                    as="textarea"
                    label={field.label}
                    name={field.name}
                    required={field.required}
                    hint={field.hint}
                    error={errors[field.name]}
                    value={values[field.name]}
                    onChange={set(field.name)}
                    rows={field.rows || 4}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'color' ? (
                  <div className={`field${errors[field.name] ? ' has-error' : ''}`}>
                    <span className="field__label">{field.label}</span>
                    <div className="color-field">
                      <input
                        type="color"
                        className="color-field__swatch"
                        value={/^#[0-9a-fA-F]{6}$/.test(values[field.name]) ? values[field.name] : '#D81E4A'}
                        onChange={set(field.name)}
                        aria-label={field.label}
                      />
                      <input
                        className="input numeral"
                        value={values[field.name]}
                        onChange={set(field.name)}
                        placeholder="#D81E4A"
                        dir="ltr"
                      />
                    </div>
                    {errors[field.name] && <span className="field__error">{errors[field.name]}</span>}
                    {!errors[field.name] && field.hint && <span className="field__hint">{field.hint}</span>}
                  </div>
                ) : (
                  <Field
                    label={field.label}
                    name={field.name}
                    type={field.type === 'number' ? 'number' : field.type || 'text'}
                    required={field.required}
                    hint={field.hint}
                    error={errors[field.name]}
                    value={values[field.name]}
                    onChange={set(field.name)}
                    placeholder={field.placeholder}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    dir={field.dir}
                    readOnly={field.readOnly}
                    autoComplete={field.autoComplete}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {extra}

      <div className="res-form__actions">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
}
