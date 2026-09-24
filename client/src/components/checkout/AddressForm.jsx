import Field from '@/components/ui/Field.jsx';
import { GOVERNORATES } from '@/data/content.js';

/**
 * نموذج عنوان قابل لإعادة الاستخدام (صفحة الدفع + دفتر العناوين).
 * يتحكّم فيه الأب بالكامل (controlled) حتى يملك منطق الحفظ والتحقّق.
 */
export default function AddressForm({ value, onChange, errors = {}, onSubmit, onCancel, submitLabel = 'حفظ العنوان' }) {
  const update = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--s-3)' }}>
        <Field label="اسم العنوان" name="label" value={value.label} onChange={update('label')} placeholder="المنزل / العمل" />
        <Field label="اسم المستلم" name="recipient_name" required error={errors.recipient_name} value={value.recipient_name} onChange={update('recipient_name')} />
        <Field label="رقم الهاتف" name="phone" required error={errors.phone} value={value.phone} onChange={update('phone')} placeholder="01xxxxxxxxx" />
        <Field label="المحافظة" name="governorate" as="select" value={value.governorate} onChange={update('governorate')}>
          {GOVERNORATES.map((item) => <option key={item}>{item}</option>)}
        </Field>
        <Field label="المدينة / الحي" name="city" required error={errors.city} value={value.city} onChange={update('city')} />
        <Field label="المنطقة" name="area" value={value.area} onChange={update('area')} />
      </div>

      <Field label="الشارع" name="street" required error={errors.street} value={value.street} onChange={update('street')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)' }}>
        <Field label="العمارة" name="building" value={value.building} onChange={update('building')} />
        <Field label="الدور" name="floor" value={value.floor} onChange={update('floor')} />
        <Field label="الشقة" name="apartment" value={value.apartment} onChange={update('apartment')} />
      </div>

      <Field label="علامة مميّزة" name="landmark" hint="تساعد المندوب على الوصول أسرع" value={value.landmark} onChange={update('landmark')} />

      <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>إلغاء</button>}
      </div>
    </form>
  );
}
