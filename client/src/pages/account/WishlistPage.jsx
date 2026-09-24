import ProductCard from '@/components/product/ProductCard.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { ProductGridSkeleton } from '@/components/ui/Skeleton.jsx';
import { IconHeart } from '@/lib/icons.jsx';
import { wishlistService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';

/** المفضّلة بأسعار وتوفّر الفرع الحالي */
export default function WishlistPage() {
  const { branchId, branch } = useBranch();
  const { ids } = useWishlist();

  // نعيد الجلب كلما تغيّرت المجموعة ليختفي الصنف فور إزالته
  const items = useAsync(() => wishlistService.list(branchId), [branchId, ids.size]);

  if (items.loading) return <ProductGridSkeleton count={6} />;

  if ((items.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="لا توجد أصناف في مفضّلتك"
        description="اضغط على القلب في أي منتج ليُحفظ هنا، وستعرف فور نزول سعره."
        actionLabel="تصفّح المتجر"
        actionTo="/shop"
        icon={<IconHeart size={44} />}
      />
    );
  }

  return (
    <>
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        الأسعار والتوفّر معروضة حسب فرع {branch?.name_ar}.
      </p>
      <div className="pgrid">
        {items.data.map((product, index) => (
          <ProductCard key={product.id} product={product} delay={(index % 5) + 1} />
        ))}
      </div>
    </>
  );
}
