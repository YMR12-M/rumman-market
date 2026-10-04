import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '@/components/ui/Field.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import FulfillmentStep from '@/components/checkout/FulfillmentStep.jsx';
import SlotPicker from '@/components/checkout/SlotPicker.jsx';
import PaymentOptions from '@/components/checkout/PaymentOptions.jsx';
import PointsSlider from '@/components/checkout/PointsSlider.jsx';
import { IconCheck } from '@/lib/icons.jsx';
import { addressService, orderService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useCart } from '@/context/CartContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

const STEPS = ['طريقة الاستلام', 'الموعد والدفع', 'المراجعة'];
const POINT_VALUE = 0.05; // قيمة النقطة بالجنيه — تطابق إعداد الخادم

/** تواريخ الأيام الأربعة القادمة لاختيار موعد التوصيل */
function nextDays(count = 4) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      label: index === 0 ? 'اليوم'
        : index === 1 ? 'غدًا'
        : new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric' }).format(date),
    };
  });
}

const EMPTY_ADDRESS = {
  label: 'المنزل', recipient_name: '', phone: '', governorate: 'القاهرة',
  city: '', area: '', street: '', building: '', floor: '', apartment: '', landmark: '',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, refresh } = useCart();
  const { branch, branchId } = useBranch();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [fulfillment, setFulfillment] = useState('delivery');
  const [addressId, setAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ ...EMPTY_ADDRESS });
  const [addressErrors, setAddressErrors] = useState({});

  const days = useMemo(() => nextDays(), []);
  const [slotDate, setSlotDate] = useState(days[0].value);
  const [slot, setSlot] = useState(null);
  const [payment, setPayment] = useState('cod');
  const [usePoints, setUsePoints] = useState(0);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const addresses = useAsync(() => addressService.list(), []);
  const slots = useAsync(() => orderService.slots(branchId, slotDate), [branchId, slotDate]);

  // اختيار العنوان الافتراضي تلقائيًا عند تحميل القائمة
  useEffect(() => {
    if (!addressId && addresses.data?.length) {
      setAddressId((addresses.data.find((item) => item.is_default) ?? addresses.data[0]).id);
    }
  }, [addresses.data, addressId]);

  // تعبئة بيانات المستلم من حساب العميل لتسريع إضافة أول عنوان
  useEffect(() => {
    if (user && !addressForm.recipient_name) {
      setAddressForm((form) => ({ ...form, recipient_name: user.full_name, phone: user.phone ?? '' }));
    }
  }, [user, addressForm.recipient_name]);

  /** أقصى نقاط قابلة للاستبدال: الرصيد أو نصف قيمة السلة — أيّهما أقل */
  const maxPoints = Math.min(
    user?.loyalty_points ?? 0,
    Math.floor((cart.totals.subtotal * 0.5) / POINT_VALUE),
  );
  const pointsValue = Number((usePoints * POINT_VALUE).toFixed(2));
  const deliveryFee = fulfillment === 'pickup' ? 0 : cart.totals.delivery_fee;
  const grandTotal = Math.max(0, Number(
    (cart.totals.subtotal - cart.totals.discount_total - pointsValue + deliveryFee + cart.totals.tax_total).toFixed(2),
  ));

  const saveAddress = async (event) => {
    event.preventDefault();
    setAddressErrors({});
    try {
      const created = await addressService.create({ ...addressForm, is_default: !addresses.data?.length });
      await addresses.reload();
      setAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm({ ...EMPTY_ADDRESS, recipient_name: user.full_name, phone: user.phone ?? '' });
      toast.success('أُضيف العنوان');
    } catch (error) {
      setAddressErrors(error.errors ?? {});
      toast.error(error.message);
    }
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const order = await orderService.create({
        branch_id: branchId,
        fulfillment_type: fulfillment,
        address_id: fulfillment === 'delivery' ? addressId : undefined,
        payment_method: payment,
        slot_date: slot ? slotDate : undefined,
        slot_from: slot?.from,
        slot_to: slot?.to,
        customer_note: note || undefined,
        use_points: usePoints,
      });

      await Promise.all([refresh(), refreshUser()]);
      toast.success(`تم تأكيد طلبك ${order.order_number}`);
      navigate(`/account/orders/${order.order_number}?new=1`);
    } catch (error) {
      toast.error(error.message);
      // السلة تغيّرت تحت أقدامنا (نفدت كمية مثلًا) ⇒ نعيده للسلة ليصحّح
      if (error.code === 'CART_ISSUES' || error.code === 'STOCK_CHANGED') {
        await refresh();
        navigate('/cart');
      }
    } finally {
      setPlacing(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container section">
        <EmptyState title="لا يمكن إتمام طلب فارغ" description="أضِف بعض الأصناف إلى سلتك أولًا." actionLabel="تصفّح المتجر" actionTo="/shop" />
      </div>
    );
  }

  const canContinue = step === 1
    ? (fulfillment === 'pickup' || Boolean(addressId))
    : step === 2
      ? (fulfillment === 'pickup' || Boolean(slot))
      : true;

  const selectedAddress = addresses.data?.find((item) => item.id === addressId);

  return (
    <div className="container section--tight">
      <span className="eyebrow">إتمام الطلب</span>
      <h1 style={{ marginBottom: 'var(--s-5)' }}>خطوتان وتصلك مائدتك</h1>

      <div className="steps">
        {STEPS.map((label, index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
            <div className={`step${step === index + 1 ? ' is-active' : ''}${step > index + 1 ? ' is-done' : ''}`}>
              <span className="step__num">{step > index + 1 ? <IconCheck size={14} /> : index + 1}</span>
              {label}
            </div>
            {index < STEPS.length - 1 && <span className="step__line" />}
          </div>
        ))}
      </div>

      <div className="checkout-grid">
        <div>
          {step === 1 && (
            <FulfillmentStep
              branch={branch}
              deliveryFee={cart.totals.delivery_fee}
              fulfillment={fulfillment}
              onFulfillmentChange={setFulfillment}
              addresses={addresses.data}
              addressId={addressId}
              onAddressChange={setAddressId}
              showForm={showAddressForm}
              onToggleForm={() => setShowAddressForm((open) => !open)}
              form={addressForm}
              onFormChange={setAddressForm}
              formErrors={addressErrors}
              onSaveAddress={saveAddress}
            />
          )}

          {step === 2 && (
            <div className="stack">
              {fulfillment === 'delivery' && (
                <SlotPicker
                  days={days}
                  selectedDate={slotDate}
                  onDateChange={(value) => { setSlotDate(value); setSlot(null); }}
                  slots={slots.data}
                  selectedSlot={slot}
                  onSlotChange={setSlot}
                />
              )}

              <PaymentOptions
                value={payment}
                onChange={setPayment}
                walletBalance={user?.wallet_balance ?? 0}
                dueAmount={grandTotal}
              />

              <PointsSlider
                balance={user?.loyalty_points ?? 0}
                maxPoints={maxPoints}
                value={usePoints}
                onChange={setUsePoints}
                pointsValue={pointsValue}
              />

              <div className="panel">
                <Field
                  label="ملاحظة للفرع (اختياري)"
                  name="note"
                  as="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="مثال: الفاكهة ناضجة من فضلك، أو اتصل قبل الوصول."
                  style={{ minHeight: 92 }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <div className="panel">
                <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>راجع طلبك</h3>

                <dl className="pdp__facts" style={{ margin: 0 }}>
                  <div className="pdp__fact"><dt>الفرع</dt><dd>{branch?.name_ar}</dd></div>
                  <div className="pdp__fact"><dt>طريقة الاستلام</dt><dd>{fulfillment === 'delivery' ? 'توصيل' : 'استلام من الفرع'}</dd></div>
                  <div className="pdp__fact"><dt>الدفع</dt><dd>{payment === 'cod' ? 'عند الاستلام' : payment === 'card' ? 'بطاقة' : 'محفظة رُمّان'}</dd></div>
                  {slot && (
                    <div className="pdp__fact">
                      <dt>الموعد</dt>
                      <dd>{days.find((d) => d.value === slotDate)?.label} · {slot.from} — {slot.to}</dd>
                    </div>
                  )}
                </dl>

                {fulfillment === 'delivery' && selectedAddress && (
                  <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--s-4)' }}>
                    {selectedAddress.street}، {selectedAddress.area || selectedAddress.city}، {selectedAddress.governorate}
                    {' — '}{selectedAddress.recipient_name} · {selectedAddress.phone}
                  </p>
                )}
              </div>

              <div className="panel">
                <h4 style={{ fontSize: 'var(--t-base)', marginBottom: 'var(--s-3)' }}>الأصناف ({cart.items_count})</h4>
                {cart.items.map((item) => (
                  <div key={item.product_id} className="summary__row">
                    <span>{item.name_ar} <span className="muted numeral">×{item.quantity}</span></span>
                    <span className="numeral">{money(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--s-3)', marginTop: 'var(--s-5)' }}>
            {step > 1 && <button type="button" className="btn btn--outline" onClick={() => setStep(step - 1)}>رجوع</button>}
            {step < 3 ? (
              <button type="button" className="btn btn--primary" disabled={!canContinue} onClick={() => setStep(step + 1)} style={{ flex: 1 }}>
                متابعة
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--lg" disabled={placing} onClick={placeOrder} style={{ flex: 1 }}>
                {placing ? 'جارٍ تأكيد الطلب…' : `تأكيد الطلب · ${money(grandTotal)}`}
              </button>
            )}
          </div>
        </div>

        <aside className="summary">
          <div className="receipt">
            <div className="receipt__paper">
              <div className="receipt__title">رُمّان</div>
              <div className="receipt__sub">{branch?.name_ar} · إيصال الطلب</div>
              <hr />

              {cart.items.slice(0, 8).map((item) => (
                <div className="leader" key={item.product_id}>
                  <span>{item.name_ar} × {item.quantity}</span>
                  <span className="numeral">{money(item.line_total).replace(' ج.م', '')}</span>
                </div>
              ))}
              {cart.items.length > 8 && (
                <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>و{cart.items.length - 8} أصناف أخرى…</div>
              )}
              <hr />

              <div className="leader"><span>المجموع الفرعي</span><span className="numeral">{money(cart.totals.subtotal)}</span></div>
              {cart.totals.discount_total > 0 && (
                <div className="leader"><span>خصم {cart.coupon?.code}</span><span className="numeral">−{money(cart.totals.discount_total)}</span></div>
              )}
              {pointsValue > 0 && (
                <div className="leader"><span>نقاط الولاء</span><span className="numeral">−{money(pointsValue)}</span></div>
              )}
              <div className="leader"><span>التوصيل</span><span className="numeral">{deliveryFee > 0 ? money(deliveryFee) : 'مجاني'}</span></div>
              {cart.totals.tax_total > 0 && (
                <div className="leader"><span>ضريبة القيمة المضافة</span><span className="numeral">{money(cart.totals.tax_total)}</span></div>
              )}
              <hr />
              <div className="leader leader--total">
                <span>الإجمالي</span>
                <span>{money(grandTotal).replace(' ج.م', '')} <small style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>ج.م</small></span>
              </div>

              <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-3)' }}>
                ستكسب <strong className="numeral">{num(Math.floor(cart.totals.subtotal))}</strong> نقطة عند تسليم هذا الطلب.
              </p>

              <div className="receipt__thanks">شكرًا لزيارتكم</div>
              <div className="barcode" aria-hidden="true" />
            </div>
          </div>

          <Link to="/cart" className="btn btn--ghost btn--block btn--sm" style={{ marginTop: 'var(--s-4)' }}>تعديل السلة</Link>
        </aside>
      </div>
    </div>
  );
}
