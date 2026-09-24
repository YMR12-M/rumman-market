import { useState } from 'react';
import AddressForm from '@/components/checkout/AddressForm.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { IconPlus, IconTrash, IconPin } from '@/lib/icons.jsx';
import { addressService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

const emptyForm = (user) => ({
  label: 'المنزل',
  recipient_name: user?.full_name ?? '',
  phone: user?.phone ?? '',
  governorate: 'القاهرة',
  city: '', area: '', street: '', building: '', floor: '', apartment: '', landmark: '',
});

/** إدارة دفتر العناوين: إضافة، تعيين افتراضي، حذف */
export default function AddressesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const addresses = useAsync(() => addressService.list(), []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user));
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    try {
      await addressService.create({ ...form, is_default: !addresses.data?.length });
      await addresses.reload();
      setForm(emptyForm(user));
      setOpen(false);
      toast.success('أُضيف العنوان');
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    }
  };

  const makeDefault = async (id) => {
    await addressService.update(id, { is_default: true });
    await addresses.reload();
    toast.success('صار العنوان الافتراضي');
  };

  const remove = async (id) => {
    await addressService.remove(id);
    await addresses.reload();
    toast.toast('حُذف العنوان');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: 'var(--t-md)' }}>عناوين التوصيل</h2>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen((value) => !value)}>
          <IconPlus size={14} /> عنوان جديد
        </button>
      </div>

      {open && (
        <div className="panel" style={{ marginBottom: 'var(--s-5)' }}>
          <AddressForm
            value={form}
            onChange={setForm}
            errors={errors}
            onSubmit={submit}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}

      {!addresses.loading && (addresses.data?.length ?? 0) === 0 && !open && (
        <EmptyState
          title="لا توجد عناوين محفوظة"
          description="أضِف عنوانك الأول لتتمكّن من إتمام الطلبات بسرعة."
          actionLabel="أضف عنوانًا"
          onAction={() => setOpen(true)}
          icon={<IconPin size={44} />}
        />
      )}

      <div className="stack">
        {addresses.data?.map((address) => (
          <div className="panel" key={address.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontFamily: 'var(--font-display)' }}>
                  {address.label}
                  {Boolean(address.is_default) && <span className="badge badge--saffron" style={{ marginInlineStart: 8 }}>افتراضي</span>}
                </strong>
                <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 6 }}>
                  {address.street}، {address.area || address.city}، {address.governorate}
                  {address.building && ` — عمارة ${address.building}`}
                  {address.floor && `، دور ${address.floor}`}
                  {address.apartment && `، شقة ${address.apartment}`}
                  {address.landmark && <><br />علامة مميّزة: {address.landmark}</>}
                  <br />{address.recipient_name} · <span className="numeral">{address.phone}</span>
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-start' }}>
                {!address.is_default && (
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => makeDefault(address.id)}>
                    اجعله افتراضيًا
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => remove(address.id)} aria-label="حذف العنوان">
                  <IconTrash size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
