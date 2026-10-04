import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconChevronLeft, IconPackage, IconRefresh } from '@/lib/icons.jsx';
import { orderService } from '@/services/index.js';
import { usePagedList } from '@/hooks/useMobile.js';
import { useCart } from '@/context/CartContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, formatDateTime, num, ORDER_STATUS_META } from '@/lib/format.js';

const FILTERS = [
  ['', 'الكل'],
  ['pending', 'قيد المراجعة'],
  ['preparing', 'قيد التجهيز'],
  ['out_for_delivery', 'في الطريق'],
  ['delivered', 'تم التسليم'],
  ['cancelled', 'ملغي'],
];

/**
 * تبويب «طلباتي» — كل طلبات الحساب، الأحدث أولًا، مع إعادة الطلب
 * بنقرة لما سُلِّم أو أُلغي. الزائر يرى دعوة لتسجيل الدخول لا قائمة
 * فارغة توحي بأنه لم يطلب شيئًا قط.
 */
export default function OrdersScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (!authLoading && !isAuthenticated) {
    return (
      <Screen title="طلباتي">
        <EmptyState
          icon={<IconPackage size={36} />}
          title="سجّل الدخول لترى طلباتك"
          text="طلباتك وتتبّعها لحظة بلحظة مرتبطة بحسابك."
          actionLabel="تسجيل الدخول"
          to="/login?next=/orders"
        />
      </Screen>
    );
  }

  return <OrdersList />;
}

function OrdersList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshCart } = useCart();
  const [status, setStatus] = useState('');

  const orders = usePagedList(
    (page) => orderService.list({ status: status || undefined, page, limit: 10 }),
    [status],
  );

  const reorder = async (orderNumber) => {
    try {
      const result = await orderService.reorder(orderNumber);
      await refreshCart();
      toast.success(result.skipped?.length ? `أُضيف المتاح. تعذّر: ${result.skipped.join('، ')}` : 'أُضيفت الأصناف إلى سلتك');
      navigate('/cart');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Screen title="طلباتي" onRefresh={orders.refresh}>
      <div className="chip-row" style={{ marginBlockEnd: 'var(--s-3)' }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            className={`chip${status === value ? ' is-active' : ''}`}
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
          >
            {label}
          </button>
        ))}
      </div>

      {orders.loading && <div className="stack">{[1, 2, 3].map((index) => <Skeleton key={index} height={132} radius="var(--r-lg)" />)}</div>}

      {!orders.loading && orders.error && <ErrorState error={orders.error} onRetry={orders.refresh} />}

      {!orders.loading && !orders.error && orders.items.length === 0 && (
        <EmptyState
          icon={<IconPackage size={36} />}
          title={status ? 'لا طلبات بهذه الحالة' : 'لا توجد طلبات بعد'}
          text={status ? 'جرّب حالة أخرى.' : 'عندما تطلب من رُمّان ستجد كل طلباتك هنا، مع إعادة الطلب بنقرة.'}
          actionLabel={status ? undefined : 'ابدأ التسوّق'}
          to={status ? undefined : '/categories'}
        />
      )}

      <div className="stack">
        {orders.items.map((order) => {
          const meta = ORDER_STATUS_META[order.status] ?? { label: order.status, tone: 'pending' };
          const canReorder = ['delivered', 'cancelled'].includes(order.status);
          return (
            <article key={order.id ?? order.order_number} className="card order-card">
              <Link to={`/orders/${order.order_number}`} className="stack--tight" style={{ gap: 'var(--s-2)' }}>
                <div className="row row--between">
                  <span className="order-card__num ltr">{order.order_number}</span>
                  <span className={`pill pill--${meta.tone}`}>{meta.label}</span>
                </div>
                <span className="text-xs muted">
                  {order.branch_name} · {formatDateTime(order.placed_at)} · <span className="numeral">{num(order.items_count)}</span> صنفًا
                </span>
                {order.preview_items?.length > 0 && (
                  <span className="order-card__items">
                    {order.preview_items.map((item) => `${item.name_snapshot} ×${item.quantity}`).join(' · ')}
                    {order.items_count > order.preview_items.length && ` و${order.items_count - order.preview_items.length} أخرى`}
                  </span>
                )}
              </Link>
              <div className="row row--between">
                <strong className="numeral ltr">{money(order.grand_total)}</strong>
                <div className="row" style={{ gap: 'var(--s-2)' }}>
                  {canReorder && (
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => reorder(order.order_number)}>
                      <IconRefresh size={15} /> أعد الطلب
                    </button>
                  )}
                  <Link to={`/orders/${order.order_number}`} className="btn btn--ghost btn--sm">
                    التفاصيل <IconChevronLeft size={15} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {orders.hasMore && (
        <button type="button" className="btn btn--outline btn--block" style={{ marginBlockStart: 'var(--s-4)' }} onClick={orders.loadMore} disabled={orders.loadingMore}>
          {orders.loadingMore ? <span className="spinner" /> : 'عرض طلبات أقدم'}
        </button>
      )}
    </Screen>
  );
}
