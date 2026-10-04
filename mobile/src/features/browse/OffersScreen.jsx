import Screen from '@/components/shell/Screen.jsx';
import ProductTile from '@/components/product/ProductTile.jsx';
import { EmptyState, GridSkeleton, SectionHead } from '@/components/ui/Feedback.jsx';
import { IconTag } from '@/lib/icons.jsx';
import { IconCopy } from '@/lib/mobile-icons.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { usePagedList } from '@/hooks/useMobile.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { copyText } from '@/lib/device.js';
import { money, num } from '@/lib/format.js';

/**
 * العروض: أكواد الخصم الفعّالة، ثم كل الأصناف المخفّضة في الفرع.
 * كل كود يُنسخ بنقرة، لأن كتابة كودٍ من الذاكرة على لوحة مفاتيح الهاتف
 * أسرع طريقة لخطأ حرفٍ واحد يُفشل الخصم عند الدفع.
 */
export default function OffersScreen() {
  const { branchId, branch } = useBranch();
  const toast = useToast();

  const coupons = useAsync(() => catalogService.coupons(), []);
  const deals = usePagedList(
    (page) => (branchId ? catalogService.products({ branch_id: branchId, on_sale: true, page, limit: 20 }) : Promise.resolve({ items: [], meta: null })),
    [branchId],
  );

  const copy = async (code) => {
    const done = await copyText(code);
    if (done) toast.success(`نُسخ الكود ${code}`);
    else toast.toast(`الكود: ${code}`);
  };

  const describe = (coupon) => {
    if (coupon.type === 'percentage') {
      return <>خصم <span className="numeral">{num(coupon.value)}%</span>{coupon.max_discount ? <> حتى <span className="ltr">{money(coupon.max_discount)}</span></> : null}</>;
    }
    if (coupon.type === 'fixed') return <>خصم <span className="ltr">{money(coupon.value)}</span></>;
    return 'توصيل مجاني';
  };

  return (
    <Screen title="العروض" subtitle={branch ? `في ${branch.name_ar}` : undefined} back onRefresh={() => Promise.all([coupons.reload(), deals.refresh()])}>
      {(coupons.data?.length ?? 0) > 0 && (
        <section aria-label="أكواد الخصم">
          <SectionHead title="أكواد الخصم" eyebrow="انسخ الكود واستخدمه عند الدفع" />
          <div className="stack--tight">
            {coupons.data.map((coupon) => (
              <div key={coupon.code} className="card card--pad stack--tight">
                <div className="row">
                  <IconTag size={18} className="text-brand" />
                  <strong style={{ fontFamily: 'var(--font-display)' }}>{describe(coupon)}</strong>
                </div>
                {coupon.title_ar && <p className="text-sm soft">{coupon.title_ar}</p>}
                {Number(coupon.min_order_amount) > 0 && (
                  <p className="text-xs muted">الحدّ الأدنى للطلب <span className="ltr">{money(coupon.min_order_amount)}</span></p>
                )}
                <button type="button" className="btn btn--outline btn--block" onClick={() => copy(coupon.code)} aria-label={`نسخ الكود ${coupon.code}`}>
                  <span className="numeral ltr" style={{ letterSpacing: '0.16em' }}>{coupon.code}</span>
                  <IconCopy size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <SectionHead title="أصناف عليها خصم" eyebrow={deals.meta?.total ? `${num(deals.meta.total)} صنفًا بسعر أقل` : undefined} />

      {deals.loading && <GridSkeleton count={4} />}

      {!deals.loading && deals.items.length === 0 && (
        <EmptyState title="لا خصومات حاليًا في فرعك" text="حين تُضاف عروض جديدة ستظهر هنا." actionLabel="تصفّح المتجر" to="/shop" />
      )}

      {deals.items.length > 0 && (
        <>
          <div className="pgrid">
            {deals.items.map((product) => <ProductTile key={product.id} product={product} />)}
          </div>
          {deals.hasMore && (
            <button type="button" className="btn btn--outline btn--block" style={{ marginBlockStart: 'var(--s-5)' }} onClick={deals.loadMore} disabled={deals.loadingMore}>
              {deals.loadingMore ? <span className="spinner" /> : 'عرض المزيد'}
            </button>
          )}
        </>
      )}
    </Screen>
  );
}
