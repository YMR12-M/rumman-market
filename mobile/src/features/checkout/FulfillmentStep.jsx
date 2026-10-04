import { IconPlus, IconStore, IconTruck } from '@/lib/icons.jsx';
import { Skeleton } from '@/components/ui/Feedback.jsx';
import { money, num } from '@/lib/format.js';

/** سطر العنوان المختصر كما يُعرض في بطاقة الاختيار والمراجعة */
export const addressLine = (address) => [
  address.street,
  address.area || address.city,
  address.governorate,
].filter(Boolean).join('، ')
  + (address.building ? ` — عمارة ${address.building}` : '')
  + (address.apartment ? ` شقة ${address.apartment}` : '');

/** الخطوة الأولى: توصيل أم استلام، ثم عنوان التوصيل */
export default function FulfillmentStep({
  branch, deliveryFee, fulfillment, onFulfillmentChange,
  addresses, addressesLoading, addressId, onAddressChange, onAddAddress,
}) {
  return (
    <div className="stack">
      <section>
        <h2 className="card__title">كيف تحبّ أن تستلم طلبك؟</h2>

        <label className={`option${fulfillment === 'delivery' ? ' is-selected' : ''}`}>
          <input type="radio" name="fulfillment" checked={fulfillment === 'delivery'} onChange={() => onFulfillmentChange('delivery')} />
          <span className="option__icon"><IconTruck size={22} /></span>
          <span className="option__body">
            <span className="option__title">توصيل إلى عنوانك</span>
            <span className="option__note">
              من {branch?.name_ar} · {Number(deliveryFee) > 0 ? <span className="ltr">{money(deliveryFee)}</span> : 'مجاني على هذا الطلب'}
            </span>
          </span>
        </label>

        <label className={`option${fulfillment === 'pickup' ? ' is-selected' : ''}`}>
          <input type="radio" name="fulfillment" checked={fulfillment === 'pickup'} onChange={() => onFulfillmentChange('pickup')} />
          <span className="option__icon" style={{ '--tone': 'var(--success-text)' }}><IconStore size={22} /></span>
          <span className="option__body">
            <span className="option__title">الاستلام من الفرع</span>
            <span className="option__note">
              {branch?.avg_prep_minutes > 0 && <>جاهز خلال نحو <span className="numeral">{num(branch.avg_prep_minutes)}</span> دقيقة · </>}
              بلا رسوم توصيل
            </span>
          </span>
        </label>
      </section>

      {fulfillment === 'delivery' && (
        <section>
          <div className="row row--between" style={{ marginBlockEnd: 'var(--s-2)' }}>
            <h2 className="card__title" style={{ margin: 0 }}>عنوان التوصيل</h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onAddAddress}>
              <IconPlus size={16} /> عنوان جديد
            </button>
          </div>

          {addressesLoading && <Skeleton height={96} />}

          {!addressesLoading && (addresses?.length ?? 0) === 0 && (
            <button type="button" className="option" onClick={onAddAddress}>
              <span className="option__icon"><IconPlus size={20} /></span>
              <span className="option__body">
                <span className="option__title">أضف عنوانك الأول</span>
                <span className="option__note">نحفظه لطلباتك القادمة.</span>
              </span>
            </button>
          )}

          {addresses?.map((address) => (
            <label key={address.id} className={`option${addressId === address.id ? ' is-selected' : ''}`}>
              <input type="radio" name="address" checked={addressId === address.id} onChange={() => onAddressChange(address.id)} />
              <span className="option__body">
                <span className="option__title">
                  {address.label}
                  {Boolean(address.is_default) && <span className="badge badge--soft" style={{ marginInlineStart: 8 }}>افتراضي</span>}
                </span>
                <span className="option__note">{addressLine(address)}</span>
                <span className="option__note">{address.recipient_name} · <span className="ltr">{address.phone}</span></span>
              </span>
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
