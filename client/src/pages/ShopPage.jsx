import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/product/ProductCard.jsx';
import { ProductGridSkeleton } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { IconFilter, IconClose, IconChevronLeft } from '@/lib/icons.jsx';
import { getMotif } from '@/lib/motifs.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync, useMediaQuery } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { money } from '@/lib/format.js';

/** خيارات الترتيب المتاحة للعميل */
const SORTS = [
  ['featured', 'المختارات أولًا'],
  ['popular', 'الأكثر طلبًا'],
  ['newest', 'الأحدث'],
  ['price_asc', 'السعر: من الأقل'],
  ['price_desc', 'السعر: من الأعلى'],
  ['rating', 'الأعلى تقييمًا'],
  ['name', 'أبجديًا'],
];

/** مفاتيح الفلاتر المنطقية (تُخزَّن في الرابط كـ true) */
const TOGGLES = [
  ['organic', 'عضوي معتمد'],
  ['exclusive', 'حصري في رُمّان'],
  ['on_sale', 'عليه خصم'],
  ['in_stock', 'متوفّر الآن'],
];

const PRICE_BANDS = [
  ['0-50', 'أقل من 50'],
  ['50-150', '50 — 150'],
  ['150-400', '150 — 400'],
  ['400-1000', '400 — 1000'],
  ['1000-', 'أكثر من 1000'],
];

export default function ShopPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branchId, categories } = useBranch();
  const isMobile = useMediaQuery('(max-width: 980px)');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCategory = slug ?? searchParams.get('category') ?? null;
  const page = Number(searchParams.get('page')) || 1;
  const sort = searchParams.get('sort') || 'featured';
  const search = searchParams.get('search') || '';
  const priceBand = searchParams.get('price') || '';
  const minRating = searchParams.get('min_rating') || '';

  const [minPrice, maxPrice] = useMemo(() => {
    if (!priceBand) return [undefined, undefined];
    const [min, max] = priceBand.split('-');
    return [min ? Number(min) : undefined, max ? Number(max) : undefined];
  }, [priceBand]);

  const queryParams = useMemo(() => ({
    branch_id: branchId,
    category: activeCategory,
    search: search || undefined,
    sort,
    page,
    limit: 24,
    min_price: minPrice,
    max_price: maxPrice,
    min_rating: minRating || undefined,
    ...Object.fromEntries(TOGGLES.map(([key]) => [key, searchParams.get(key) === 'true' || undefined])),
  }), [branchId, activeCategory, search, sort, page, minPrice, maxPrice, minRating, searchParams]);

  const products = useAsync(() => catalogService.products(queryParams), [JSON.stringify(queryParams)]);
  const category = useAsync(
    () => (activeCategory ? catalogService.category(activeCategory, branchId) : Promise.resolve(null)),
    [activeCategory, branchId],
  );

  /** تعديل معامل واحد في الرابط مع إعادة الترقيم للصفحة الأولى */
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === false) next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const clearAll = () => setSearchParams(search ? { search } : {});

  /** الفلاتر الفعّالة — تُعرض كرقائق قابلة للإزالة */
  const activeChips = [
    priceBand && { key: 'price', label: PRICE_BANDS.find(([value]) => value === priceBand)?.[1] },
    minRating && { key: 'min_rating', label: `${minRating} نجوم فأكثر` },
    ...TOGGLES.filter(([key]) => searchParams.get(key) === 'true').map(([key, label]) => ({ key, label })),
    !slug && activeCategory && { key: 'category', label: categories.find((c) => c.slug === activeCategory)?.name_ar },
  ].filter(Boolean);

  const Motif = getMotif(category.data?.motif);
  const meta = products.data?.meta;

  const filtersPanel = (
    <aside className={`filters${filtersOpen ? ' is-open' : ''}`}>
      {!slug && (
        <div className="filter-group">
          <div className="filter-group__title">الأقسام</div>
          <button type="button" className={`filter-option${!activeCategory ? ' is-active' : ''}`} onClick={() => setParam('category', null)}>
            كل الأقسام
          </button>
          {categories.map((item) => (
            <button
              key={item.slug}
              type="button"
              className={`filter-option${activeCategory === item.slug ? ' is-active' : ''}`}
              onClick={() => setParam('category', item.slug)}
            >
              {item.name_ar}
              <span className="filter-option__count">{item.products_count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="filter-group">
        <div className="filter-group__title">السعر</div>
        {PRICE_BANDS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`filter-option${priceBand === value ? ' is-active' : ''}`}
            onClick={() => setParam('price', priceBand === value ? null : value)}
          >
            {label} ج.م
          </button>
        ))}
      </div>

      <div className="filter-group">
        <div className="filter-group__title">التقييم</div>
        {[4.5, 4, 3.5].map((value) => (
          <button
            key={value}
            type="button"
            className={`filter-option${Number(minRating) === value ? ' is-active' : ''}`}
            onClick={() => setParam('min_rating', Number(minRating) === value ? null : value)}
          >
            {value} نجوم فأكثر
          </button>
        ))}
      </div>

      <div className="filter-group">
        <div className="filter-group__title">خصائص</div>
        {TOGGLES.map(([key, label]) => (
          <label className="checkbox" key={key} style={{ paddingBlock: 5 }}>
            <input
              type="checkbox"
              checked={searchParams.get(key) === 'true'}
              onChange={(event) => setParam(key, event.target.checked ? 'true' : null)}
            />
            <span style={{ fontSize: 'var(--t-sm)' }}>{label}</span>
          </label>
        ))}
      </div>

      {activeChips.length > 0 && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll} style={{ marginTop: 'var(--s-4)' }}>
          مسح كل الفلاتر
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* رأس القسم أو صفحة التسوّق العامة */}
      <div
        className={`cat-hero${category.data ? ' cat-hero--colored' : ''}`}
        style={category.data ? { '--cat-color': category.data.accent_color } : undefined}
      >
        <div className="container">
          <nav className="crumbs">
            <Link to="/">الرئيسية</Link>
            <span aria-hidden="true"><IconChevronLeft size={12} /></span>
            {slug ? <><Link to="/shop">المتجر</Link><span aria-hidden="true"><IconChevronLeft size={12} /></span><span>{category.data?.name_ar ?? '…'}</span></> : <span>المتجر</span>}
          </nav>

          <span className={`eyebrow${category.data ? ' eyebrow--onDark' : ''}`}>
            {category.data?.aisle_code ? `ممر ${category.data.aisle_code}` : 'الكتالوج الكامل'}
          </span>
          <h1>{category.data?.name_ar ?? (search ? `نتائج البحث عن «${search}»` : 'كل المنتجات')}</h1>
          {category.data?.tagline_ar && <p className="lede" style={{ marginTop: 'var(--s-3)' }}>{category.data.tagline_ar}</p>}
          {category.data?.description_ar && (
            <p className="muted" style={{ fontSize: 'var(--t-sm)', maxWidth: '70ch', marginTop: 'var(--s-3)' }}>
              {category.data.description_ar}
            </p>
          )}
        </div>
        {category.data && <Motif className="cat-hero__motif" />}
      </div>

      <div className="container section--tight">
        <div className="shop">
          {(!isMobile || filtersOpen) && filtersPanel}

          <div>
            <div className="shop__toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                {isMobile && (
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setFiltersOpen((open) => !open)}>
                    <IconFilter size={15} /> الفلاتر
                  </button>
                )}
                <span className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                  {products.loading ? 'جارٍ التحميل…' : `${meta?.total ?? 0} صنفًا`}
                </span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', fontSize: 'var(--t-sm)' }}>
                <span className="muted">ترتيب</span>
                <select className="select" value={sort} onChange={(event) => setParam('sort', event.target.value)} style={{ width: 'auto' }}>
                  {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>

            {activeChips.length > 0 && (
              <div className="chip-row">
                {activeChips.map((chip) => (
                  <span className="chip" key={chip.key}>
                    {chip.label}
                    <button type="button" onClick={() => setParam(chip.key, null)} aria-label={`إزالة ${chip.label}`}>
                      <IconClose size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {products.loading && <ProductGridSkeleton count={12} />}

            {!products.loading && (products.data?.items?.length ?? 0) === 0 && (
              <EmptyState
                title="لم نجد ما يطابق بحثك"
                description="جرّب تعديل الفلاتر أو كلمات البحث. يمكنك أيضًا تصفّح الأقسام لاكتشاف بدائل."
                actionLabel="مسح الفلاتر"
                onAction={clearAll}
              />
            )}

            {!products.loading && (products.data?.items?.length ?? 0) > 0 && (
              <>
                <div className="pgrid">
                  {products.data.items.map((product, index) => (
                    <ProductCard key={product.id} product={product} delay={(index % 5) + 1} />
                  ))}
                </div>

                <Pagination
                  page={meta?.page ?? 1}
                  totalPages={meta?.totalPages ?? 1}
                  onChange={(next) => setParam('page', next)}
                />
              </>
            )}

            {category.data?.price_range?.min_price != null && (
              <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-6)', textAlign: 'center' }}>
                أسعار هذا القسم تتراوح بين {money(category.data.price_range.min_price)} و{money(category.data.price_range.max_price)}.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
