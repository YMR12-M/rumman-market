import ProductCard from '@/components/product/ProductCard.jsx';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { ProductGridSkeleton } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { IconTag, IconCheck } from '@/lib/icons.jsx';
import { getMotif } from '@/lib/motifs.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money } from '@/lib/format.js';

/** صفحة العروض: أكواد الخصم الفعّالة + كل المنتجات المخفّضة */
export default function OffersPage() {
  const { branchId } = useBranch();
  const toast = useToast();

  const coupons = useAsync(() => catalogService.coupons(), []);
  const promotions = useAsync(() => catalogService.promotions(), []);
  const deals = useAsync(() => catalogService.products({ branch_id: branchId, on_sale: true, limit: 48 }), [branchId]);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`نُسخ الكود ${code}`);
    } catch {
      toast.toast(`الكود: ${code}`);
    }
  };

  const describe = (coupon) => {
    if (coupon.type === 'percentage') {
      return `خصم ${coupon.value}%${coupon.max_discount ? ` حتى ${money(coupon.max_discount)}` : ''}`;
    }
    if (coupon.type === 'fixed') return `خصم ${money(coupon.value)}`;
    return 'توصيل مجاني';
  };

  return (
    <>
      <div className="cat-hero">
        <div className="container">
          <span className="eyebrow">عروض فعّالة الآن</span>
          <h1>خصومات نصنعها، لا أسعار نرفعها ثم نخفضها</h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
            كل خصم هنا محسوب من السعر الذي نبيع به طوال العام. لا أرقام مشطوبة وهمية.
          </p>
        </div>
      </div>

      <div className="container section--tight">
        {/* أكواد الخصم */}
        <SectionHead eyebrow="أكواد الخصم" title="انسخ الكود واستخدمه عند الدفع" />

        <div className="editorial" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {(coupons.data ?? []).map((coupon) => (
            <div className="panel" key={coupon.code} style={{ display: 'grid', gap: 'var(--s-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <IconTag size={18} style={{ color: 'var(--brand-text)' }} />
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>{describe(coupon)}</strong>
              </div>

              <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{coupon.title_ar}</p>

              {coupon.min_order_amount > 0 && (
                <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                  الحد الأدنى للطلب {money(coupon.min_order_amount)}
                </p>
              )}

              <button
                type="button"
                className="btn btn--outline"
                onClick={() => copy(coupon.code)}
                style={{ fontFamily: 'var(--font-num)', letterSpacing: '0.18em', fontSize: 'var(--t-base)' }}
              >
                {coupon.code}
              </button>
            </div>
          ))}
        </div>

        {/* الحملات التحريرية */}
        {promotions.data?.length > 0 && (
          <div className="editorial" style={{ marginTop: 'var(--s-7)' }}>
            {promotions.data.map((promo) => {
              const Motif = getMotif(promo.category_motif || 'wheat');
              return (
                <article className="promo-card" key={promo.slug} style={{ background: promo.accent, minHeight: 200 }}>
                  <Motif className="promo-card__motif" />
                  <h3>{promo.title_ar}</h3>
                  <p>{promo.subtitle_ar}</p>
                </article>
              );
            })}
          </div>
        )}

        {/* المنتجات المخفّضة */}
        <div style={{ marginTop: 'var(--s-8)' }}>
          <SectionHead
            eyebrow="بأسعار مخفّضة"
            title="كل الأصناف التي عليها خصم"
            description={`${deals.data?.meta?.total ?? 0} صنفًا بسعر أقل هذا الأسبوع`}
          />

          {deals.loading && <ProductGridSkeleton count={8} />}

          {!deals.loading && (deals.data?.items?.length ?? 0) === 0 && (
            <EmptyState title="لا توجد خصومات حاليًا" description="تابعنا — نطرح مختارات مخفّضة كل يوم أحد." actionLabel="تصفّح المتجر" actionTo="/shop" />
          )}

          {!deals.loading && deals.data?.items?.length > 0 && (
            <div className="pgrid">
              {deals.data.items.map((product, index) => (
                <ProductCard key={product.id} product={product} delay={(index % 5) + 1} />
              ))}
            </div>
          )}
        </div>

        {/* شروط مختصرة وواضحة */}
        <div className="panel" style={{ marginTop: 'var(--s-7)' }}>
          <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)' }}>شروط بسيطة وواضحة</h3>
          <ul style={{ display: 'grid', gap: 'var(--s-2)' }}>
            {[
              'كود خصم واحد لكل طلب — لا يمكن جمع كودين.',
              'يمكن استخدام النقاط مع الكود في نفس الطلب.',
              'العروض سارية على المتاح في فرعك المختار فقط.',
              'تنتهي العروض الأسبوعية مساء السبت ما لم يُذكر خلاف ذلك.',
            ].map((line) => (
              <li key={line} style={{ display: 'flex', gap: 'var(--s-2)', fontSize: 'var(--t-sm)' }}>
                <IconCheck size={16} style={{ color: 'var(--gold-400)', flexShrink: 0, marginTop: 4 }} /> {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
