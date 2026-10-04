import { Link } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import CategoryTiles from '@/components/product/CategoryTiles.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconChevronLeft, IconGrid, IconSearch, IconTag } from '@/lib/icons.jsx';
import { useBranch } from '@/context/BranchContext.jsx';

/**
 * تبويب الأقسام — كل ممرّات الفرع المختار بألوانها، ومعها طريقان
 * مختصران: كل المنتجات، والعروض. عدّاد كل قسم يتبع الفرع لأن
 * المخزون يختلف بين الفروع.
 */
export default function CategoriesScreen() {
  const { categories, branch, loading } = useBranch();

  return (
    <Screen
      title="الأقسام"
      subtitle={branch ? `المتاح في ${branch.name_ar}` : undefined}
      trailing={(
        <Link to="/search" className="icon-btn" aria-label="بحث">
          <IconSearch size={22} />
        </Link>
      )}
    >
      <div className="list" style={{ marginBlockEnd: 'var(--s-5)' }}>
        <Link to="/shop" className="list-row">
          <span className="list-row__icon"><IconGrid size={18} /></span>
          <span className="list-row__body">
            <span className="list-row__title">كل المنتجات</span>
            <span className="list-row__sub">مع الترتيب والتصفية</span>
          </span>
          <span className="list-row__trail"><IconChevronLeft size={18} /></span>
        </Link>
        <Link to="/offers" className="list-row">
          <span className="list-row__icon" style={{ '--tone': 'var(--plum)' }}><IconTag size={18} /></span>
          <span className="list-row__body">
            <span className="list-row__title">العروض</span>
            <span className="list-row__sub">تخفيضات وأكواد خصم سارية</span>
          </span>
          <span className="list-row__trail"><IconChevronLeft size={18} /></span>
        </Link>
      </div>

      {loading && categories.length === 0 && <Skeleton height={320} />}

      {!loading && categories.length === 0 && (
        <EmptyState title="لا توجد أقسام بعد" text="ستظهر أقسام المتجر هنا فور إضافتها." />
      )}

      {categories.length > 0 && <CategoryTiles categories={categories} />}
    </Screen>
  );
}
