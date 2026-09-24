import { useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import OrderCard from '@/components/account/OrderCard.jsx';
import { orderService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { useCart } from '@/context/CartContext.jsx';


const FILTERS = [
  ['', 'الكل'],
  ['pending', 'قيد المراجعة'],
  ['preparing', 'قيد التجهيز'],
  ['out_for_delivery', 'في الطريق'],
  ['delivered', 'تم التسليم'],
  ['cancelled', 'ملغي'],
];

export default function OrdersPage() {
  const toast = useToast();
  const { refresh: refreshCart, openDrawer } = useCart();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const orders = useAsync(() => orderService.list({ status: status || undefined, page, limit: 8 }), [status, page]);

  const reorder = async (orderNumber) => {
    try {
      const result = await orderService.reorder(orderNumber);
      await refreshCart();
      toast.success(result.skipped?.length ? `أُضيف المتاح. تعذّر: ${result.skipped.join('، ')}` : 'أُضيفت كل الأصناف إلى سلتك');
      openDrawer();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 'var(--s-5)' }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            className={`btn btn--sm ${status === value ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => { setStatus(value); setPage(1); }}
          >
            {label}
          </button>
        ))}
      </div>

      {orders.loading && [1, 2, 3].map((i) => <Skeleton key={i} height={130} style={{ marginBottom: 'var(--s-4)' }} />)}

      {!orders.loading && (orders.data?.items?.length ?? 0) === 0 && (
        <EmptyState
          title="لا توجد طلبات بعد"
          description="عندما تطلب من رُمّان ستجد كل طلباتك هنا، مع إمكانية إعادة الطلب بضغطة."
          actionLabel="ابدأ التسوّق"
          actionTo="/shop"
        />
      )}

      {orders.data?.items?.map((order) => (
        <OrderCard key={order.id} order={order} onReorder={reorder} />
      ))}

      <Pagination page={orders.data?.meta?.page ?? 1} totalPages={orders.data?.meta?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
