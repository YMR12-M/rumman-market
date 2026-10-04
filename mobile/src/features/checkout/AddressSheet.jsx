import { useEffect, useState } from 'react';
import Sheet from '@/components/ui/Sheet.jsx';
import Field from '@/components/ui/Field.jsx';
import { addressService } from '@/services/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { GOVERNORATES } from '@/data/content.js';

const emptyForm = (user) => ({
  label: 'المنزل',
  recipient_name: user?.full_name ?? '',
  phone: user?.phone ?? '',
  governorate: GOVERNORATES[0],
  city: '', area: '', street: '', building: '', floor: '', apartment: '', landmark: '',
});

/**
 * ═══════════════════════════════════════════════════════════════
 *  إضافة عنوان في ورقة سفلية — من شاشة الدفع ومن دفتر العناوين
 *
 *  اسم المستلم وهاتفه يُملآن من الحساب، لأن معظم العناوين لصاحبها.
 *  الهاتف حقل لاتيني الاتجاه بلوحة أرقام، والتحقّق النهائي في الخادم
 *  (رقم مصري صحيح)؛ أخطاء الحقول تعود منه وتظهر تحت كل حقل.
 * ═══════════════════════════════════════════════════════════════
 */
export default function AddressSheet({ open, onClose, onSaved, makeDefault = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyForm(user));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setForm(emptyForm(user)); setErrors({}); }
  }, [open, user]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      // الحقول الفارغة الاختيارية لا تُرسل: الخادم يرفض النصّ الفارغ في بعضها
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => String(value).trim() !== ''));
      const created = await addressService.create({ ...payload, is_default: makeDefault });
      toast.success('أُضيف العنوان');
      onSaved?.(created);
      onClose();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="عنوان جديد"
      footer={(
        <button type="submit" form="address-form" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? <span className="spinner" /> : 'حفظ العنوان'}
        </button>
      )}
    >
      <form id="address-form" onSubmit={submit} noValidate>
        <Field label="اسم العنوان" name="label" value={form.label} onChange={update('label')} placeholder="المنزل، العمل…" error={errors.label} />
        <Field label="اسم المستلم" name="recipient_name" required value={form.recipient_name} onChange={update('recipient_name')} autoComplete="name" error={errors.recipient_name} />
        <Field
          label="رقم الهاتف"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          value={form.phone}
          onChange={update('phone')}
          placeholder="01xxxxxxxxx"
          error={errors.phone}
        />
        <Field label="المحافظة" name="governorate" as="select" value={form.governorate} onChange={update('governorate')} error={errors.governorate}>
          {GOVERNORATES.map((item) => <option key={item}>{item}</option>)}
        </Field>
        <div className="field-grid">
          <Field label="المدينة / الحي" name="city" required value={form.city} onChange={update('city')} error={errors.city} />
          <Field label="المنطقة" name="area" value={form.area} onChange={update('area')} error={errors.area} />
        </div>
        <Field label="الشارع" name="street" required value={form.street} onChange={update('street')} autoComplete="street-address" error={errors.street} />
        <div className="field-grid field-grid--3">
          <Field label="العمارة" name="building" value={form.building} onChange={update('building')} error={errors.building} />
          <Field label="الدور" name="floor" inputMode="numeric" value={form.floor} onChange={update('floor')} error={errors.floor} />
          <Field label="الشقة" name="apartment" value={form.apartment} onChange={update('apartment')} error={errors.apartment} />
        </div>
        <Field label="علامة مميّزة" name="landmark" hint="تساعد المندوب على الوصول أسرع" value={form.landmark} onChange={update('landmark')} error={errors.landmark} />
      </form>
    </Sheet>
  );
}
