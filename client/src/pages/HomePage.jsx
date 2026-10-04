import SectionHead from '@/components/brand/SectionHead.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';

import Hero from '@/components/home/Hero.jsx';
import PromiseStrip from '@/components/home/PromiseStrip.jsx';
import CategoryGrid from '@/components/home/CategoryGrid.jsx';
import PromoStrip from '@/components/home/PromoStrip.jsx';
import BrandStory from '@/components/home/BrandStory.jsx';
import LoyaltyBand from '@/components/home/LoyaltyBand.jsx';
import BranchStrip from '@/components/home/BranchStrip.jsx';

import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { num } from '@/lib/format.js';

/**
 * الصفحة الرئيسية — مجرّد تركيب لمكوّنات مستقلّة.
 * كل قسم بصري يعيش في ملفه تحت components/home، فتبقى هذه الصفحة
 * قابلة للقراءة في نظرة واحدة ويسهل إعادة ترتيب أقسامها.
 */
export default function HomePage() {
  const { branchId, branches, categories, openPicker, branch } = useBranch();
  const { counts } = useSite();

  const featured  = useAsync(() => catalogService.products({ branch_id: branchId, featured: true, limit: 10 }), [branchId]);
  const deals     = useAsync(() => catalogService.products({ branch_id: branchId, on_sale: true, limit: 10 }), [branchId]);
  const popular   = useAsync(() => catalogService.products({ branch_id: branchId, sort: 'popular', limit: 10 }), [branchId]);
  const exclusive = useAsync(() => catalogService.products({ branch_id: branchId, exclusive: true, limit: 10 }), [branchId]);
  const promotions = useAsync(() => catalogService.promotions(), []);

  return (
    <>
      <Hero />

      <div className="section--tight"><PromiseStrip /></div>

      <section className="section container">
        <SectionHead
          eyebrow="ممرّات المتجر"
          title={counts.categories > 1 ? `${num(counts.categories)} أقسام، كلٌّ بمعاييره` : 'أقسام المتجر'}
          description="لكل قسم مسؤول مشتريات يعرف موسمه ومصادره. اختر القسم لتبدأ."
          actionLabel="كل المنتجات"
          actionTo="/shop"
        />
        <CategoryGrid categories={categories} />
      </section>

      <section className="section--tight container">
        <ProductRail
          eyebrow="مختارات الأسبوع"
          title="ما نوصي به اليوم"
          description={branch ? `متاح الآن في ${branch.name_ar}` : undefined}
          actionLabel="عرض الكل"
          actionTo="/shop?featured=true"
          products={featured.data?.items}
          loading={featured.loading}
        />
      </section>

      <section className="section--tight container">
        <PromoStrip promotions={promotions.data} />
      </section>

      {/* شريط العروض: حقل أحمر بنقاط نصف تون وحواف مسنّنة — ذروة الصفحة */}
      {(deals.loading || (deals.data?.items?.length ?? 0) > 0) && (
      <section className="band band--red">
        <div className="container">
          <ProductRail
            tone="dark"
            eyebrow="بسعر أفضل"
            title="عروض هذا الأسبوع"
            description="تخفيضات حقيقية على أصناف نبيعها طوال العام — لا أسعار مرفوعة ثم مخفّضة."
            actionLabel="كل العروض"
            actionTo="/offers"
            products={deals.data?.items}
            loading={deals.loading}
          />
        </div>
      </section>
      )}

      <section className="section section--sunken">
        <BrandStory />
      </section>

      <section className="section--tight container" style={{ paddingTop: 'var(--s-7)' }}>
        <ProductRail
          eyebrow="يثق بها عملاؤنا"
          title="الأكثر طلبًا هذا الشهر"
          products={popular.data?.items}
          loading={popular.loading}
          actionLabel="عرض الكل"
          actionTo="/shop?sort=popular"
        />
      </section>

      <section className="section--tight container">
        <ProductRail
          eyebrow="لا تجدها في مكان آخر"
          title="حصري في رُمّان"
          products={exclusive.data?.items}
          loading={exclusive.loading}
          actionLabel="عرض الكل"
          actionTo="/shop?exclusive=true"
        />
      </section>

      <LoyaltyBand />

      {branches.length > 0 && (
        <section className="section container">
          <SectionHead
            eyebrow="أين تجدنا"
            title={branches.length > 1 ? `${num(branches.length)} فروع، معيار واحد` : 'فرعنا'}
            description="لكل فرع مخزونه وأسعاره ومواعيده — اختر الأقرب إليك ليعرض لك المتاح فيه فعلًا."
            actionLabel="كل الفروع"
            actionTo="/branches"
          />
          <BranchStrip branches={branches} activeBranchId={branchId} onPick={openPicker} />
        </section>
      )}
    </>
  );
}
