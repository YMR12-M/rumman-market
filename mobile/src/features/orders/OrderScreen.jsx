import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ConfirmSheet from '@/components/ui/ConfirmSheet.jsx';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import PaymentPanel from './PaymentPanel.jsx';
import StaffOrderActions from '@/features/staff/StaffOrderActions.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconPhone, IconRefresh, IconStar, IconStore, IconTruck } from '@/lib/icons.jsx';
import { orderService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useCart } from '@/context/CartContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import {
  money, num, formatDateTime, ORDER_STATUS_META, ORDER_FLOW, paymentLabel, PAYMENT_STATUS_META,
} from '@/lib/format.js';
import { haptic } from '@/lib/haptics.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  تفاصيل الطلب وتتبّعه
 *
 *  الخط الزمني يُبنى من مسار الحالات الثابت، وتُعلَّم المراحل المنجزة
 *  من سجلّ الخادم — فيبقى المسار مفهومًا حتى لو تخطّى الفرع مرحلة.
 *
 *  على الهاتف يعود العميل إلى الطلب بعد ساعات من الخلفية، فنعيد جلبه
 *  كلما عاد التطبيق إلى الواجهة: الحالة التي يراها هي حالته الآن، لا
 *  حالته لحظة فتح الشاشة.
 * ═══════════════════════════════════════════════════════════════
 */
export default function OrderScreen() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshCart } = useCart();
  const { isStaff } = useAuth();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);

  const order = useAsync(() => orderService.detail(orderNumber), [orderNumber]);
  const isNew = params.get('new') === '1';

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') order.reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [order.reload]);

  if (order.loading && !order.data) {
    return (
      <Screen title="الطلب" back="/orders">
        <Skeleton height={140} radius="var(--r-lg)" />
        <Skeleton height={260} radius="var(--r-lg)" style={{ marginTop: 'var(--s-4)' }} />
      </Screen>
    );
  }

  if (!order.data) {
    return (
      <Screen title="الطلب" back="/orders">
        <EmptyState title="لم نجد هذا الطلب" text={order.error?.message} actionLabel="كل الطلبات" to="/orders" />
      </Screen>
    );
  }

  const data = order.data;
  const meta = ORDER_STATUS_META[data.status] ?? { label: data.status, tone: 'pending' };
  const isCancelled = ['cancelled', 'refunded'].includes(data.status);
  const reached = new Set((data.timeline ?? []).map((row) => row.status));
  const currentIndex = ORDER_FLOW.indexOf(data.status);
  const flow = data.fulfillment_type === 'pickup' ? ORDER_FLOW.filter((status) => status !== 'out_for_delivery') : ORDER_FLOW;
  // إلغاء الفريق يحفظ سببه في سجلّ الحالات لا في cancel_reason
  const cancelReason = data.cancel_reason || data.timeline?.find((row) => row.status === 'cancelled')?.note;

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderService.cancel(orderNumber, 'إلغاء من العميل');
      await order.reload();
      setConfirmCancel(false);
      toast.success('تم إلغاء الطلب');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCancelling(false);
    }
  };

  const reorder = async () => {
    try {
      const result = await orderService.reorder(orderNumber);
      await refreshCart();
      toast.success(result.skipped?.length ? `أُضيف المتاح. تعذّر: ${result.skipped.join('، ')}` : 'أُضيفت الأصناف إلى سلتك');
      navigate('/cart');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const rate = async (value) => {
    haptic('tap');
    setRating(value);
    try {
      await orderService.rate(orderNumber, value);
      toast.success('شكرًا لتقييمك');
      order.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Screen title={<span className="ltr">{data.order_number}</span>} subtitle={data.branch_name} back="/orders" onRefresh={order.reload}>
      {isNew && (
        <p className="notice notice--success" style={{ marginBlockEnd: 'var(--s-4)' }}>
          <IconCheck size={18} />
          <span>
            <strong>استلمنا طلبك — شكرًا لثقتك.</strong>
            <br />سيبدأ فريق {data.branch_name} التجهيز فور تأكيد الطلب، وستصلك إشعارات بكل مرحلة.
          </span>
        </p>
      )}

      <header className="card card--noir order-hero">
        <div className="row row--between">
          <span className="order-hero__label">رقم الطلب</span>
          <span className={`pill pill--${meta.tone}`}>{meta.label}</span>
        </div>
        <span className="order-hero__number ltr">{data.order_number}</span>
        <span className="order-hero__meta">
          {formatDateTime(data.placed_at)} · {data.branch_name} · <span className="numeral">{num(data.items?.length ?? 0)}</span> صنفًا
        </span>
        <strong className="order-hero__total ltr">{money(data.grand_total)}</strong>
      </header>

      {isStaff && !isCancelled && (
        <div style={{ marginBlockStart: 'var(--s-4)' }}>
          <StaffOrderActions order={data} onChanged={order.reload} />
        </div>
      )}

      {!isCancelled && (
        <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
          <h2 className="card__title">تتبّع الطلب</h2>
          <ol className="timeline">
            {flow.map((status) => {
              const index = ORDER_FLOW.indexOf(status);
              const done = reached.has(status) || index < currentIndex;
              const current = status === data.status;
              const entry = data.timeline?.find((row) => row.status === status);
              return (
                <li key={status} className={`timeline__item${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
                  <span className="timeline__dot" aria-hidden="true" />
                  <span className="timeline__label">{ORDER_STATUS_META[status]?.label}</span>
                  <span className="timeline__time">
                    {entry ? formatDateTime(entry.created_at) : current ? 'جارٍ الآن' : 'قادم'}
                    {entry?.note ? ` — ${entry.note}` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {isCancelled && (
        <p className="notice notice--danger" style={{ marginBlockStart: 'var(--s-4)' }}>
          <span>
            <strong>هذا الطلب {meta.label}.</strong>
            {cancelReason && <><br />السبب: {cancelReason}</>}
            {data.payment_status === 'refunded' && <><br />أُعيد المبلغ إلى محفظتك في رُمّان.</>}
          </span>
        </p>
      )}

      {!isCancelled && (
        <div style={{ marginBlockStart: 'var(--s-4)' }}>
          <PaymentPanel order={data} onChanged={order.reload} />
        </div>
      )}

      {data.status === 'delivered' && !data.rating && !isStaff && (
        <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
          <h2 className="card__title" style={{ marginBlockEnd: 'var(--s-1)' }}>كيف كانت تجربة التوصيل؟</h2>
          <p className="text-sm muted">تقييمك يصل مباشرةً إلى مدير الفرع.</p>
          <div className="row" style={{ gap: 0, justifyContent: 'center', marginBlockStart: 'var(--s-2)' }} role="radiogroup" aria-label="التقييم">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} من 5`}
                className={`star-btn${value <= rating ? ' is-on' : ''}`}
                onClick={() => rate(value)}
              >
                <IconStar size={30} filled={value <= rating} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
        <h2 className="card__title">الأصناف (<span className="numeral">{num(data.items?.length ?? 0)}</span>)</h2>
        {data.items?.map((item) => {
          const plate = <ProductPlate name={item.name_snapshot} motif={item.category_motif} accent={item.category_accent} compact />;
          return (
            <div key={item.id} className="prow">
              <span className="prow__media">{item.slug ? <Link to={`/product/${item.slug}`} aria-label={item.name_snapshot}>{plate}</Link> : plate}</span>
              <span className="prow__body">
                <span className="prow__name">{item.name_snapshot}</span>
                <span className="prow__meta"><span className="numeral">{item.quantity}</span> × <span className="ltr">{money(item.unit_price)}</span></span>
              </span>
              <span className="prow__price ltr">{money(item.line_total)}</span>
            </div>
          );
        })}
      </section>

      {/* ملخّص الطلب إيصالٌ حراري: حافّة مسنّنة، وخطوط منقّطة بين البند وسعره */}
      <div className="receipt" style={{ marginBlockStart: 'var(--s-5)' }}>
        <div className="receipt__paper">
          <div className="receipt__title">رُمّان</div>
          <div className="receipt__sub">{data.branch_name} · <span className="ltr">{data.order_number}</span></div>
          <hr />

          <div className="leader"><span>المجموع الفرعي</span><span className="numeral">{money(data.subtotal)}</span></div>
          {Number(data.discount_total) > 0 && (
            <div className="leader"><span>خصم {data.coupon_code && <span className="ltr">{data.coupon_code}</span>}</span><span className="numeral">−{money(data.discount_total)}</span></div>
          )}
          {Number(data.points_redeemed) > 0 && (
            <div className="leader"><span>نقاط (<span className="numeral">{num(data.points_redeemed)}</span>)</span><span className="numeral">−{money(data.points_value)}</span></div>
          )}
          <div className="leader"><span>التوصيل</span><span className="numeral">{Number(data.delivery_fee) > 0 ? money(data.delivery_fee) : 'مجاني'}</span></div>
          {Number(data.tax_total) > 0 && <div className="leader"><span>الضريبة</span><span className="numeral">{money(data.tax_total)}</span></div>}
          <hr />
          <div className="leader leader--total">
            <span>الإجمالي</span>
            <span>{money(data.grand_total).replace(' ج.م', '')} <small style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>ج.م</small></span>
          </div>

          {Number(data.points_earned) > 0 && (
            <p className="muted" style={{ fontSize: 'var(--t-xs)', marginBlockStart: 'var(--s-2)' }}>
              {data.status === 'delivered' ? 'كسبت' : 'ستكسب'} <strong className="numeral">{num(data.points_earned)}</strong> نقطة من هذا الطلب.
            </p>
          )}

          <hr />

          <dl className="receipt__kv">
            <div>
              <dt>الاستلام</dt>
              <dd className="row" style={{ gap: 6 }}>
                {data.fulfillment_type === 'delivery' ? <IconTruck size={16} /> : <IconStore size={16} />}
                {data.fulfillment_type === 'delivery' ? 'توصيل' : 'من الفرع'}
              </dd>
            </div>
            {data.slot_date && (
              <div>
                <dt>الموعد</dt>
                <dd className="numeral ltr">{data.slot_date} · {String(data.slot_from).slice(0, 5)} — {String(data.slot_to).slice(0, 5)}</dd>
              </div>
            )}
            <div>
              <dt>الدفع</dt>
              <dd>{paymentLabel(data.payment_method)} · {(PAYMENT_STATUS_META[data.payment_status] ?? {}).label ?? data.payment_status}</dd>
            </div>
            {data.address && (
              <div>
                <dt>العنوان</dt>
                <dd>
                  {data.address.street}، {data.address.area || data.address.city}
                  <br />{data.address.recipient_name} · <span className="ltr">{data.address.phone}</span>
                </dd>
              </div>
            )}
            {data.customer_note && (
              <div>
                <dt>ملاحظتك</dt>
                <dd>{data.customer_note}</dd>
              </div>
            )}
          </dl>

          <div className="receipt__thanks">شكرًا لزيارتكم</div>
          <div className="barcode" aria-hidden="true" />
        </div>
      </div>

      <div className="stack--tight" style={{ marginBlockStart: 'var(--s-4)' }}>
        {data.can_reorder && (
          <button type="button" className="btn btn--outline btn--block" onClick={reorder}>
            <IconRefresh size={16} /> أعد الطلب
          </button>
        )}
        {data.branch_phone && (
          <a href={`tel:${data.branch_phone}`} className="btn btn--ghost btn--block">
            <IconPhone size={16} /> اتصل بـ {data.branch_name}
          </a>
        )}
        {data.can_cancel && !isStaff && (
          <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirmCancel(true)}>إلغاء الطلب</button>
        )}
      </div>

      <ConfirmSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        busy={cancelling}
        title="إلغاء الطلب؟"
        message="يُلغى الطلب قبل بدء تجهيزه، وتعود نقاطك المستخدمة إلى رصيدك. لا يمكن التراجع عن الإلغاء."
        confirmLabel="نعم، ألغِ الطلب"
        cancelLabel="أبقِ الطلب"
      />
    </Screen>
  );
}
