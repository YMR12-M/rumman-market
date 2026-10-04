import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import BranchPick from '@/components/branch/BranchPick.jsx';
import CategoryTiles from '@/components/product/CategoryTiles.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';
import PromoCards from './PromoCards.jsx';
import LoyaltyCard from './LoyaltyCard.jsx';
import { EmptyState, SectionHead, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconBell, IconSearch, IconTag } from '@/lib/icons.jsx';
import { Fruit, OpenFruit, Burst } from '@/lib/art.jsx';
import { PROMISES } from '@/data/content.js';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

/**
 * ═══════════════════════════════════════════════════════════════
 *  الرئيسية — تركيب لأقسام مستقلّة، كالصفحة الرئيسية المكتبية
 *
 *  الترتيب مبنيّ على ما يفعله العميل على الهاتف: يتأكّد من فرعه، يبحث
 *  أو يدخل قسمًا، ثم يتصفّح المختارات والعروض. كل شريط يختفي إن لم يكن
 *  في قاعدة البيانات ما يملؤه — فالمتجر يبدأ فارغًا، والشاشة تقول ذلك
 *  بصراحة بدل عناوين فوق فراغ.
 * ═══════════════════════════════════════════════════════════════
 */
export default function HomeScreen() {
  const { branchId, branch, categories, loading: branchLoading } = useBranch();
  const site = useSite();
  const { isAuthenticated } = useAuth();

  const featured = useAsync(() => (branchId ? catalogService.products({ branch_id: branchId, featured: true, limit: 10 }) : Promise.resolve(null)), [branchId]);
  const deals = useAsync(() => (branchId ? catalogService.products({ branch_id: branchId, on_sale: true, limit: 10 }) : Promise.resolve(null)), [branchId]);
  const popular = useAsync(() => (branchId ? catalogService.products({ branch_id: branchId, sort: 'popular', limit: 10 }) : Promise.resolve(null)), [branchId]);
  const exclusive = useAsync(() => (branchId ? catalogService.products({ branch_id: branchId, exclusive: true, limit: 10 }) : Promise.resolve(null)), [branchId]);
  const promotions = useAsync(() => catalogService.promotions(), []);

  const refresh = () => Promise.all([featured.reload(), deals.reload(), popular.reload(), exclusive.reload(), promotions.reload()]);

  const noCatalog = !site.loading && !branchLoading && !site.hasCatalog;

  return (
    <Screen
      lead={(
        <span className="appbar__brand" style={{ paddingInlineStart: 'var(--s-2)' }}>
          <Fruit size={34} />
          <span className="appbar__brand-name">{site.brand?.name || 'رُمّان'}</span>
        </span>
      )}
      trailing={isAuthenticated && (
        <Link to="/account/notifications" className="icon-btn" aria-label="الإشعارات">
          <IconBell size={22} />
        </Link>
      )}
      onRefresh={refresh}
      awning
    >
      <BranchPick />

      <Link to="/search" className="search-pill">
        <IconSearch size={20} />
        <span>ابحث عن منتج أو قسم…</span>
      </Link>

      <Announcements items={site.announcements} />

      {site.store_open === false && (
        <p className="notice notice--warn" style={{ marginBlockStart: 'var(--s-3)' }}>
          المتجر لا يستقبل طلبات جديدة الآن. يمكنك التصفّح وتجهيز سلتك حتى يعود.
        </p>
      )}

      <Hero site={site} />

      {noCatalog ? (
        <EmptyState
          title="لا توجد منتجات معروضة بعد"
          text="حين تُضاف الأقسام والمنتجات إلى المتجر ستظهر هنا مباشرة."
        />
      ) : (
        <>
          {categories.length > 0 ? (
            <section aria-label="الأقسام">
              <SectionHead title="تسوّق حسب القسم" actionLabel={categories.length > 6 ? 'كل الأقسام' : undefined} to="/categories" />
              <CategoryTiles categories={categories} limit={6} />
            </section>
          ) : branchLoading ? (
            <Skeleton height={220} style={{ marginBlockStart: 'var(--s-6)' }} />
          ) : null}

          <ProductRail
            eyebrow={branch ? `متاح الآن في ${branch.name_ar}` : undefined}
            title="مختارات الأسبوع"
            products={featured.data?.items}
            loading={featured.loading}
            actionLabel="عرض الكل"
            to="/shop?featured=true"
          />

          <PromoCards promotions={promotions.data} />

          <ProductRail
            eyebrow="بسعر أفضل"
            title="عروض هذا الأسبوع"
            products={deals.data?.items}
            loading={deals.loading}
            actionLabel="كل العروض"
            to="/offers"
          />

          <ProductRail
            title="الأكثر طلبًا"
            products={popular.data?.items}
            loading={popular.loading}
            actionLabel="عرض الكل"
            to="/shop?sort=popular"
          />

          <ProductRail
            eyebrow="لا تجدها في مكان آخر"
            title="حصري في رُمّان"
            products={exclusive.data?.items}
            loading={exclusive.loading}
            actionLabel="عرض الكل"
            to="/shop?exclusive=true"
          />

          <LoyaltyCard />
        </>
      )}
    </Screen>
  );
}

/**
 * بطاقة الترحيب: ورقة صفراء بحدّ حبر عليها رمّانة مفتوحة. العبارة التعريفية
 * من إعدادات المتجر لا من الكود، وسنة التأسيس تظهر إن وُجدت.
 */
function Hero({ site }) {
  const since = site.since_year;
  const fresh = PROMISES[0];
  return (
    <section className="home-hero" aria-label={site.brand?.name || 'رُمّان'}>
      <span className="eyebrow">
        {since ? `مائدة تستحقّ الأفضل · منذ ${since}` : (site.brand?.tagline || 'مائدة تستحقّ الأفضل')}
      </span>
      <h1 className="home-hero__title">سوق مليان <span className="hl">بالخير.</span></h1>
      <p className="home-hero__lede">نختار الصنف بأنفسنا، ونكتب مصدره على بطاقته.</p>
      <Link to="/shop" className="btn btn--primary">ابدأ التسوّق</Link>
      <OpenFruit size={190} className="home-hero__fruit" />
      {fresh && <Burst size={70} tone="brand" className="home-hero__burst">{fresh.title}</Burst>}
    </section>
  );
}

/**
 * الإعلانات السارية من قاعدة البيانات — تتبدّل كل ست ثوانٍ إن كانت
 * أكثر من واحد. لا شيء في القاعدة؟ لا شريط، بدل شعار مكتوب في الكود.
 */
function Announcements({ items }) {
  const [index, setIndex] = useState(0);
  const list = (items ?? []).filter((item) => item.text);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % list.length), 6000);
    return () => clearInterval(timer);
  }, [list.length]);

  if (list.length === 0) return null;
  const current = list[index % list.length];

  const body = (
    <>
      <IconTag size={16} />
      <span key={index} className="grow">{current.text}</span>
    </>
  );

  return current.href
    ? <Link to={current.href} className="announce" aria-live="polite">{body}</Link>
    : <p className="announce" aria-live="polite">{body}</p>;
}
