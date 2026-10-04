import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ActionBar from '@/components/shell/ActionBar.jsx';
import { EmptyState } from '@/components/ui/Feedback.jsx';
import FulfillmentStep from './FulfillmentStep.jsx';
import PaymentStep from './PaymentStep.jsx';
import ReviewStep from './ReviewStep.jsx';
import AddressSheet from './AddressSheet.jsx';
import { addressService, orderService, paymentService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useCart } from '@/context/CartContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money } from '@/lib/format.js';
import { haptic } from '@/lib/haptics.js';

const STEPS = ['طريقة الاستلام', 'الموعد والدفع', 'المراجعة'];

/** الأيام الأربعة القادمة لاختيار موعد التوصيل — بتاريخ الجهاز المحلّي */
function nextDays(count = 4) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    return {
      value,
      label: index === 0 ? 'اليوم'
        : index === 1 ? 'غدًا'
          : new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric' }).format(date),
    };
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 *  إتمام الطلب — ثلاث خطوات بشريط إجراء ثابت
 *
 *  الأرقام هنا للعرض فقط: الخادم يعيد حساب كل شيء عند إنشاء الطلب
 *  (السعر من القاعدة، والضريبة من الإعدادات، والنقاط بحدودها). قيمة
 *  النقطة وحدّ الاستبدال يُقرآن من إعدادات المتجر (`/content/site`)
 *  بدل أرقام مكتوبة في الكود — فلا يعرض التطبيق خصمًا سيرفضه الخادم.
 *
 *  إن تغيّرت السلة تحت قدمي العميل (نفد صنف أثناء الدفع) يعيده الخطأ
 *  إلى السلة ليرى ما تغيّر بدل رسالة مبهمة.
 * ═══════════════════════════════════════════════════════════════
 */
export default function CheckoutScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, refresh } = useCart();
  const { branch, branchId } = useBranch();
  const { user, refreshUser } = useAuth();
  const { loyalty } = useSite();

  const [step, setStep] = useState(1);
  const [fulfillment, setFulfillment] = useState('delivery');
  const [addressId, setAddressId] = useState(null);
  const [addressOpen, setAddressOpen] = useState(false);

  const days = useMemo(() => nextDays(), []);
  const [slotDate, setSlotDate] = useState(days[0].value);
  const [slot, setSlot] = useState(null);
  const [payment, setPayment] = useState(null);
  const [usePoints, setUsePoints] = useState(0);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const addresses = useAsync(() => addressService.list(), []);
  const slots = useAsync(
    () => (branchId && fulfillment === 'delivery' ? orderService.slots(branchId, slotDate) : Promise.resolve([])),
    [branchId, slotDate, fulfillment],
  );
  const methods = useAsync(() => paymentService.methods(), []);
  const available = methods.data?.methods ?? [];

  // العنوان الافتراضي يُختار تلقائيًا
  useEffect(() => {
    if (!addressId && addresses.data?.length) {
      setAddressId((addresses.data.find((item) => item.is_default) ?? addresses.data[0]).id);
    }
  }, [addresses.data, addressId]);

  // أول وسيلة مفعّلة في الخادم هي الافتراضية — لا «عند الاستلام» مفترضةً
  useEffect(() => {
    if (!payment && available.length) setPayment(available[0].key);
  }, [available, payment]);

  const pointValue = Number(loyalty?.point_value_egp ?? 0);
  const maxPercent = Number(loyalty?.max_redemption_percent ?? 0);
  const maxPoints = pointValue > 0
    ? Math.max(0, Math.min(Number(user?.loyalty_points ?? 0), Math.floor((cart.totals.subtotal * maxPercent / 100) / pointValue)))
    : 0;
  const pointsValue = Number((usePoints * pointValue).toFixed(2));
  const deliveryFee = fulfillment === 'pickup' ? 0 : cart.totals.delivery_fee;
  const grandTotal = Math.max(0, Number(
    (cart.totals.subtotal - cart.totals.discount_total - pointsValue + deliveryFee + cart.totals.tax_total).toFixed(2),
  ));

  // المحفظة لم تعد تكفي بعد تغيير الاستلام أو النقاط؟ لا نتركها مختارة
  useEffect(() => {
    if (payment === 'wallet' && Number(user?.wallet_balance ?? 0) < grandTotal) setPayment(available[0]?.key ?? null);
  }, [payment, grandTotal, user?.wallet_balance, available]);

  if (cart.items.length === 0) {
    return (
      <Screen title="إتمام الطلب" back stack>
        <EmptyState title="لا يمكن إتمام طلب فارغ" text="أضف بعض الأصناف إلى سلتك أولًا." actionLabel="تصفّح المتجر" to="/categories" />
      </Screen>
    );
  }

  const selectedAddress = addresses.data?.find((item) => item.id === addressId);
  const canContinue = step === 1
    ? fulfillment === 'pickup' || Boolean(addressId)
    : step === 2
      ? (fulfillment === 'pickup' || Boolean(slot)) && Boolean(payment)
      : true;

  const slotLabel = slot
    ? `${days.find((day) => day.value === slotDate)?.label} · ${String(slot.from).slice(0, 5)} — ${String(slot.to).slice(0, 5)}`
    : null;

  const goTo = (next) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const order = await orderService.create({
        branch_id: branchId,
        fulfillment_type: fulfillment,
        address_id: fulfillment === 'delivery' ? addressId : undefined,
        payment_method: payment,
        slot_date: fulfillment === 'delivery' && slot ? slotDate : undefined,
        slot_from: fulfillment === 'delivery' ? slot?.from : undefined,
        slot_to: fulfillment === 'delivery' ? slot?.to : undefined,
        customer_note: note.trim() || undefined,
        use_points: usePoints,
      });
      haptic('success');
      await Promise.all([refresh(), refreshUser()]);
      navigate(`/orders/${order.order_number}?new=1`, { replace: true });
    } catch (error) {
      toast.error(error.message);
      if (error.code === 'CART_ISSUES' || error.code === 'STOCK_CHANGED') {
        await refresh();
        navigate('/cart', { replace: true });
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Screen
      title="إتمام الطلب"
      subtitle={branch?.name_ar}
      back={step === 1 ? true : undefined}
      lead={step > 1 ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo(step - 1)}>رجوع</button>
      ) : undefined}
      stack
      actionbar
    >
      <div className="steps" aria-label={`الخطوة ${step} من ${STEPS.length}`}>
        <div className="steps__bar" aria-hidden="true">
          {STEPS.map((label, index) => <span key={label} className={`steps__seg${index < step ? ' is-done' : ''}`} />)}
        </div>
        <div className="steps__label">
          <strong>{STEPS[step - 1]}</strong>
          <span>الخطوة <span className="numeral">{step}</span> من <span className="numeral">{STEPS.length}</span></span>
        </div>
      </div>

      {step === 1 && (
        <FulfillmentStep
          branch={branch}
          deliveryFee={cart.totals.delivery_fee}
          fulfillment={fulfillment}
          onFulfillmentChange={setFulfillment}
          addresses={addresses.data}
          addressesLoading={addresses.loading}
          addressId={addressId}
          onAddressChange={setAddressId}
          onAddAddress={() => setAddressOpen(true)}
        />
      )}

      {step === 2 && (
        <PaymentStep
          fulfillment={fulfillment}
          days={days}
          slotDate={slotDate}
          onSlotDateChange={(value) => { setSlotDate(value); setSlot(null); }}
          slots={slots.data}
          slotsLoading={slots.loading}
          slot={slot}
          onSlotChange={setSlot}
          methods={available}
          methodsLoading={methods.loading}
          payment={payment}
          onPaymentChange={setPayment}
          walletBalance={user?.wallet_balance ?? 0}
          dueAmount={grandTotal}
          pointsBalance={user?.loyalty_points ?? 0}
          maxPoints={maxPoints}
          usePoints={usePoints}
          onUsePointsChange={setUsePoints}
          pointsValue={pointsValue}
          note={note}
          onNoteChange={setNote}
        />
      )}

      {step === 3 && (
        <ReviewStep
          branch={branch}
          fulfillment={fulfillment}
          address={selectedAddress}
          slotLabel={fulfillment === 'delivery' ? slotLabel : null}
          payment={payment}
          cart={cart}
          pointsValue={pointsValue}
          deliveryFee={deliveryFee}
          grandTotal={grandTotal}
          pointsToEarn={Math.floor(cart.totals.subtotal * Number(loyalty?.points_per_egp ?? 0))}
        />
      )}

      <ActionBar>
        <div className="actionbar__meta">
          <small>الإجمالي</small>
          <strong className="numeral ltr">{money(grandTotal)}</strong>
        </div>
        {step < STEPS.length ? (
          <button type="button" className="btn btn--primary btn--lg grow" disabled={!canContinue} onClick={() => goTo(step + 1)}>
            متابعة
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--lg grow" disabled={placing} onClick={placeOrder}>
            {placing ? <><span className="spinner" /> جارٍ التأكيد…</> : 'تأكيد الطلب'}
          </button>
        )}
      </ActionBar>

      <AddressSheet
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        makeDefault={!addresses.data?.length}
        onSaved={async (created) => {
          await addresses.reload();
          if (created?.id) setAddressId(created.id);
        }}
      />
    </Screen>
  );
}
