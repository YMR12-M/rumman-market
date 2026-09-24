import AddressForm from './AddressForm.jsx';
import { IconTruck, IconStore, IconPlus } from '@/lib/icons.jsx';
import { money } from '@/lib/format.js';

/** الخطوة الأولى: توصيل أم استلام، ثم اختيار العنوان أو إضافة واحد جديد */
export default function FulfillmentStep({
  branch, deliveryFee, fulfillment, onFulfillmentChange,
  addresses, addressId, onAddressChange,
  showForm, onToggleForm, form, onFormChange, formErrors, onSaveAddress,
}) {
  return (
    <div className="panel">
      <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>كيف تحبّ أن تستلم طلبك؟</h3>

      <label className={`option-card${fulfillment === 'delivery' ? ' is-selected' : ''}`}>
        <input type="radio" name="fulfillment" checked={fulfillment === 'delivery'} onChange={() => onFulfillmentChange('delivery')} />
        <IconTruck size={22} style={{ color: 'var(--brand)', flexShrink: 0 }} />
        <div>
          <div className="option-card__title">توصيل إلى عنوانك</div>
          <div className="option-card__note">
            من {branch?.name_ar} · {deliveryFee > 0 ? money(deliveryFee) : 'مجاني على هذا الطلب'}
          </div>
        </div>
      </label>

      <label className={`option-card${fulfillment === 'pickup' ? ' is-selected' : ''}`}>
        <input type="radio" name="fulfillment" checked={fulfillment === 'pickup'} onChange={() => onFulfillmentChange('pickup')} />
        <IconStore size={22} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
        <div>
          <div className="option-card__title">الاستلام من الفرع</div>
          <div className="option-card__note">جاهز خلال {branch?.avg_prep_minutes} دقيقة · بلا رسوم توصيل</div>
        </div>
      </label>

      {fulfillment === 'delivery' && (
        <div style={{ marginTop: 'var(--s-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
            <h4 style={{ fontSize: 'var(--t-base)' }}>عنوان التوصيل</h4>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onToggleForm}>
              <IconPlus size={14} /> عنوان جديد
            </button>
          </div>

          {addresses?.map((address) => (
            <label key={address.id} className={`option-card${addressId === address.id ? ' is-selected' : ''}`}>
              <input type="radio" name="address" checked={addressId === address.id} onChange={() => onAddressChange(address.id)} />
              <div>
                <div className="option-card__title">
                  {address.label}
                  {Boolean(address.is_default) && <span className="badge badge--soft" style={{ marginInlineStart: 8 }}>افتراضي</span>}
                </div>
                <div className="option-card__note">
                  {address.street}، {address.area || address.city}، {address.governorate}
                  {address.building && ` — عمارة ${address.building}`}
                  {address.apartment && ` شقة ${address.apartment}`}
                  <br />{address.recipient_name} · {address.phone}
                </div>
              </div>
            </label>
          ))}

          {showForm && (
            <div className="card card--pad" style={{ marginTop: 'var(--s-3)' }}>
              <AddressForm
                value={form}
                onChange={onFormChange}
                errors={formErrors}
                onSubmit={onSaveAddress}
                onCancel={onToggleForm}
              />
            </div>
          )}

          {addresses?.length === 0 && !showForm && (
            <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>لا توجد عناوين محفوظة — أضِف عنوانك الأول.</p>
          )}
        </div>
      )}
    </div>
  );
}
