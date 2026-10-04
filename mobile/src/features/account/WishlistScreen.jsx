import Screen from '@/components/shell/Screen.jsx';
import ProductTile from '@/components/product/ProductTile.jsx';
import { EmptyState, GridSkeleton } from '@/components/ui/Feedback.jsx';
import { IconHeart } from '@/lib/icons.jsx';
import { wishlistService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

/**
 * المفضّلة بأسعار الفرع الحالي وتوفّره. تُعاد قراءتها كلما تغيّرت
 * المجموعة، فيختفي الصنف فور إزالة القلب.
 *
 * مفضّلة الزائر محفوظة على الجهاز كمعرّفات فقط، والخادم لا يعرفها؛
 * فنطلب منه الدخول لرؤيتها بالأسعار بدل عرض قائمة لا يمكن تسعيرها.
 */
export default function WishlistScreen() {
  const { branchId, branch } = useBranch();
  const { ids } = useWishlist();
  const { isAuthenticated } = useAuth();

  const items = useAsync(
    () => (isAuthenticated && branchId ? wishlistService.list(branchId) : Promise.resolve([])),
    [branchId, ids.size, isAuthenticated],
  );

  return (
    <Screen title="المفضّلة" subtitle={branch ? `بأسعار ${branch.name_ar}` : undefined} back="/account" onRefresh={items.reload}>
      {!isAuthenticated && (
        <EmptyState icon={<IconHeart size={34} />} title="سجّل الدخول لرؤية مفضّلتك" text="نحفظ ما تحبّه في حسابك ونعرضه بأسعار فرعك." actionLabel="تسجيل الدخول" to="/login?next=/account/wishlist" />
      )}

      {isAuthenticated && items.loading && <GridSkeleton count={4} />}

      {isAuthenticated && !items.loading && (items.data?.length ?? 0) === 0 && (
        <EmptyState icon={<IconHeart size={34} />} title="لا أصناف في مفضّلتك" text="اضغط القلب على أي منتج ليُحفظ هنا." actionLabel="تصفّح المتجر" to="/categories" />
      )}

      {(items.data?.length ?? 0) > 0 && (
        <div className="pgrid">
          {items.data.map((product) => <ProductTile key={product.id} product={product} />)}
        </div>
      )}
    </Screen>
  );
}
