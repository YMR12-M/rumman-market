import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import PaymentPanel from '@/components/account/PaymentPanel.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import {
  IconCheck, IconChevronLeft, IconRefresh, IconTruck, IconStore, IconPhone, IconStar,
} from '@/lib/icons.jsx';
import { orderService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useCart } from '@/context/CartContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import {
  money, num, formatDateTime, ORDER_STATUS_META, ORDER_FLOW,
  paymentLabel, PAYMENT_STATUS_META,
} from '@/lib/format.js';

/**
 * تفاصيل الطلب وتتبّعه.
 * الخط الزمني يُبنى من مسار الحالات الثابت، ونعلّم المراحل المنجزة
 * من سجل التاريخ القادم من الخادم — فيبقى المسار مفهومًا حتى لو
 * تخطّى الفرع مرحلة.
 */
export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { refresh: refreshCart, openDrawer } = useCart();
  const toast = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);

  const order = useAsync(() => orderService.detail(orderNumber), [orderNumber]);
  const isNew = searchParams.get('new') === '1';

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderService.cancel(orderNumber, 'إلغاء من العميل');
      await order.reload();
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
      openDrawer();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const submitRating = async (value) => {
    setRating(value);
    try {
      await orderService.rate(orderNumber, value);
      toast.success('شكرًا لتقييمك');
      order.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (order.loading) {
    return <div className="container section"><Skeleton height={420} /></div>;
  }

  if (!order.data) {
    return (
      <div className="container section">
        <EmptyState title="لم نجد هذا الطلب" actionLabel="كل الطلبات" actionTo="/account/orders" />
      </div>
    );
  }

  const data = order.data;
  const meta = ORDER_STATUS_META[data.status];
  const isCancelled = ['cancelled', 'refunded'].includes(data.status);

  // المراحل المنجزة فعليًا حسب سجل الحالات
  const reached = new Set((data.timeline ?? []).map((row) => row.status));
  const currentIndex = ORDER_FLOW.indexOf(data.status);

  return (
    <div className="container section--tight">
      <nav className="crumbs">
        <Link to="/account">حسابي</Link>
        <span aria-hidden="true"><IconChevronLeft size={12} /></span>
        <Link to="/account/orders">طلباتي</Link>
        <span aria-hidden="true"><IconChevronLeft size={12} /></span>
        <span className="numeral">{data.order_number}</span>
      </nav>

      {isNew && (
        <div className="panel" style={{ borderColor: 'var(--gold-400)', background: 'var(--brand-tint)', marginBottom: 'var(--s-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'flex-start' }}>
            <IconCheck size={22} style={{ color: 'var(--brand-text)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>استلمنا طلبك — شكرًا لثقتك.</strong>
              <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>
                سيبدأ فريق {data.branch_name} التجهيز فور تأكيد الطلب، وستصلك إشعارات بكل مرحلة.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-4)', flexWrap: 'wrap', marginBottom: 'var(--s-5)' }}>
        <div>
          <span className="eyebrow">طلب رقم</span>
          <h1 className="numeral" style={{ fontSize: 'var(--t-xl)' }}>{data.order_number}</h1>
          <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{formatDateTime(data.placed_at)} · {data.branch_name}</p>
        </div>
        <span className={`status status--${meta?.tone}`} style={{ fontSize: 'var(--t-sm)' }}>{meta?.label}</span>
      </div>

      <div className="checkout-grid">
        <div className="stack">
          {/* تتبّع الطلب */}
          {!isCancelled && (
            <div className="panel">
              <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-5)' }}>تتبّع الطلب</h3>
              <div className="timeline">
                {ORDER_FLOW.map((status, index) => {
                  const done = reached.has(status) || index < currentIndex;
                  const current = status === data.status;
                  const entry = data.timeline?.find((row) => row.status === status);
                  return (
                    <div key={status} className={`timeline__item${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
                      <span className="timeline__dot" />
                      <div className="timeline__label">{ORDER_STATUS_META[status]?.label}</div>
                      <div className="timeline__time">
                        {entry ? formatDateTime(entry.created_at) : current ? 'جارٍ الآن' : 'قادم'}
                        {entry?.note ? ` — ${entry.note}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="panel" style={{ borderColor: 'var(--danger)' }}>
              <strong>هذا الطلب {meta?.label}</strong>
              {data.cancel_reason && <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 6 }}>السبب: {data.cancel_reason}</p>}
              {data.payment_status === 'refunded' && (
                <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>أُعيد المبلغ إلى محفظتك في رُمّان.</p>
              )}
            </div>
          )}

          {/* الدفع — أوّل ما يجب أن يراه العميل إن كان عليه إجراء */}
          {!isCancelled && <PaymentPanel order={data} onChanged={() => order.reload()} />}

          {/* الأصناف */}
          <div className="panel">
            <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)' }}>الأصناف ({data.items?.length})</h3>
            {data.items?.map((item) => (
              <div className="cart-line" key={item.id} style={{ gridTemplateColumns: '64px 1fr auto' }}>
                <div className="cart-line__media">
                  {item.slug ? (
                    <Link to={`/product/${item.slug}`}>
                      <ProductPlate name={item.name_snapshot} motif={item.category_motif} accent={item.category_accent} compact />
                    </Link>
                  ) : (
                    <ProductPlate name={item.name_snapshot} compact />
                  )}
                </div>
                <div>
                  <div className="cart-line__name">{item.name_snapshot}</div>
                  <div className="cart-line__meta">
                    <span className="numeral">{item.quantity}</span> × {money(item.unit_price)}
                    {item.sku_snapshot && <> · <span className="numeral">{item.sku_snapshot}</span></>}
                  </div>
                </div>
                <strong className="numeral">{money(item.line_total)}</strong>
              </div>
            ))}
          </div>

          {/* التقييم بعد التسليم */}
          {data.status === 'delivered' && !data.rating && (
            <div className="panel">
              <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-2)' }}>كيف كانت تجربة التوصيل؟</h3>
              <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>تقييمك يصل مباشرةً إلى مدير الفرع.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 'var(--s-3)' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => submitRating(value)} aria-label={`${value} نجوم`}>
                    <IconStar size={26} filled={value <= rating} style={{ color: value <= rating ? 'var(--gold-400)' : 'var(--ink-300)' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ملخّص جانبي */}
        <aside className="summary">
          <div className="panel">
            <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>الملخّص المالي</h3>

            <div className="summary__row"><span>المجموع الفرعي</span><span className="numeral">{money(data.subtotal)}</span></div>
            {data.discount_total > 0 && (
              <div className="summary__row summary__row--discount">
                <span>خصم {data.coupon_code}</span><span className="numeral">−{money(data.discount_total)}</span>
              </div>
            )}
            {data.points_redeemed > 0 && (
              <div className="summary__row summary__row--discount">
                <span>نقاط ({num(data.points_redeemed)})</span><span className="numeral">−{money(data.points_value)}</span>
              </div>
            )}
            <div className="summary__row"><span>التوصيل</span><span className="numeral">{data.delivery_fee > 0 ? money(data.delivery_fee) : 'مجاني'}</span></div>
            {data.tax_total > 0 && <div className="summary__row"><span>الضريبة</span><span className="numeral">{money(data.tax_total)}</span></div>}
            <div className="summary__row summary__row--total"><span>الإجمالي</span><span className="numeral">{money(data.grand_total)}</span></div>

            {data.points_earned > 0 && (
              <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-2)' }}>
                {data.status === 'delivered' ? 'كسبت' : 'ستكسب'} <strong className="numeral">{num(data.points_earned)}</strong> نقطة من هذا الطلب.
              </p>
            )}

            <hr />

            <dl style={{ display: 'grid', gap: 'var(--s-3)', fontSize: 'var(--t-sm)' }}>
              <div>
                <dt className="muted" style={{ fontSize: 'var(--t-xs)' }}>طريقة الاستلام</dt>
                <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {data.fulfillment_type === 'delivery' ? <IconTruck size={16} /> : <IconStore size={16} />}
                  {data.fulfillment_type === 'delivery' ? 'توصيل' : 'استلام من الفرع'}
                </dd>
              </div>

              {data.slot_date && (
                <div>
                  <dt className="muted" style={{ fontSize: 'var(--t-xs)' }}>الموعد</dt>
                  <dd style={{ margin: 0 }} className="numeral">
                    {data.slot_date} · {String(data.slot_from).slice(0, 5)} — {String(data.slot_to).slice(0, 5)}
                  </dd>
                </div>
              )}

              <div>
                <dt className="muted" style={{ fontSize: 'var(--t-xs)' }}>الدفع</dt>
                <dd style={{ margin: 0 }}>
                  {paymentLabel(data.payment_method)}
                  {' · '}
                  {(PAYMENT_STATUS_META[data.payment_status] ?? {}).label ?? data.payment_status}
                </dd>
              </div>

              {data.address && (
                <div>
                  <dt className="muted" style={{ fontSize: 'var(--t-xs)' }}>العنوان</dt>
                  <dd style={{ margin: 0 }}>
                    {data.address.street}، {data.address.area || data.address.city}
                    <br />{data.address.recipient_name} · <span className="numeral">{data.address.phone}</span>
                  </dd>
                </div>
              )}

              {data.customer_note && (
                <div>
                  <dt className="muted" style={{ fontSize: 'var(--t-xs)' }}>ملاحظتك</dt>
                  <dd style={{ margin: 0 }}>{data.customer_note}</dd>
                </div>
              )}
            </dl>

            <div style={{ display: 'grid', gap: 'var(--s-2)', marginTop: 'var(--s-5)' }}>
              {data.can_cancel && (
                <button type="button" className="btn btn--danger btn--block" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'جارٍ الإلغاء…' : 'إلغاء الطلب'}
                </button>
              )}
              {data.can_reorder && (
                <button type="button" className="btn btn--outline btn--block" onClick={reorder}>
                  <IconRefresh size={15} /> إعادة الطلب
                </button>
              )}
              <a href={`tel:${data.branch_phone}`} className="btn btn--ghost btn--block btn--sm">
                <IconPhone size={15} /> اتصل بـ {data.branch_name}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
