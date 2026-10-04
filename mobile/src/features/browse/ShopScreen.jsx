import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ProductTile from '@/components/product/ProductTile.jsx';
import Sheet from '@/components/ui/Sheet.jsx';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/ui/Feedback.jsx';
import { IconClose, IconFilter, IconSearch } from '@/lib/icons.jsx';
import { IconSort } from '@/lib/mobile-icons.jsx';
import { getArt } from '@/lib/art.jsx';
import { contrastText } from '@/lib/color.js';
import { money, num } from '@/lib/format.js';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { usePagedList } from '@/hooks/useMobile.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { PRICE_BANDS, RATINGS, SORTS, TOGGLES, priceBounds } from './filters.js';

const PAGE_SIZE = 20;

/**
 * ═══════════════════════════════════════════════════════════════
 *  قائمة المنتجات — «كل المنتجات» ونتائج البحث وصفحة القسم
 *
 *  حالة التصفية كلّها في الرابط كما في الواجهة المكتبية: زرّ الرجوع
 *  يعيد العميل إلى المرشّحات التي كان عليها، والرابط المُرسل لصديق
 *  يفتح القائمة نفسها. التصفية في ورقة سفلية تُطبَّق دفعةً واحدة عند
 *  «عرض النتائج» — لا مع كل نقرة، كي لا تتقافز القائمة خلف الورقة.
 * ═══════════════════════════════════════════════════════════════
 */
export default function ShopScreen() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { branchId, categories } = useBranch();

  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCategory = slug ?? params.get('category') ?? null;
  const sort = params.get('sort') || 'featured';
  const search = params.get('search') || '';
  const priceBand = params.get('price') || '';
  const minRating = params.get('min_rating') || '';
  const [minPrice, maxPrice] = priceBounds(priceBand);

  const query = useMemo(() => ({
    branch_id: branchId,
    category: activeCategory || undefined,
    search: search || undefined,
    sort,
    min_price: minPrice,
    max_price: maxPrice,
    min_rating: minRating || undefined,
    ...Object.fromEntries(TOGGLES.map(([key]) => [key, params.get(key) === 'true' || undefined])),
  }), [branchId, activeCategory, search, sort, minPrice, maxPrice, minRating, params]);

  const queryKey = JSON.stringify(query);
  const list = usePagedList(
    (page) => (branchId ? catalogService.products({ ...query, page, limit: PAGE_SIZE }) : Promise.resolve({ items: [], meta: null })),
    [queryKey],
  );

  const category = useAsync(
    () => (activeCategory ? catalogService.category(activeCategory, branchId) : Promise.resolve(null)),
    [activeCategory, branchId],
  );

  /** تعديل معامل واحد في الرابط */
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '' || value === false || value === undefined) next.delete(key);
    else next.set(key, String(value));
    setParams(next, { replace: true });
  };

  const activeChips = [
    priceBand && { key: 'price', label: `${PRICE_BANDS.find(([value]) => value === priceBand)?.[1] ?? priceBand} ج.م` },
    minRating && { key: 'min_rating', label: `${minRating} نجوم فأكثر` },
    ...TOGGLES.filter(([key]) => params.get(key) === 'true').map(([key, label]) => ({ key, label })),
    !slug && activeCategory && { key: 'category', label: categories.find((item) => item.slug === activeCategory)?.name_ar ?? activeCategory },
  ].filter(Boolean);

  const title = category.data?.name_ar ?? (search ? `«${search}»` : 'كل المنتجات');
  const total = list.meta?.total;
  const accent = category.data?.accent_color;
  const Art = getArt(category.data?.motif);

  return (
    <Screen
      title={title}
      subtitle={search ? 'نتائج البحث' : undefined}
      back
      trailing={(
        <Link to={search ? `/search?q=${encodeURIComponent(search)}` : '/search'} className="icon-btn" aria-label="بحث">
          <IconSearch size={22} />
        </Link>
      )}
      onRefresh={list.refresh}
    >
      {category.data && accent && (
        <header className="cat-hero" style={{ '--cat': accent, '--cat-text': contrastText(accent) }}>
          {category.data.aisle_code && <span className="cat-hero__aisle" aria-hidden="true">{category.data.aisle_code}</span>}
          {category.data.aisle_code && <span className="eyebrow eyebrow--onColor">ممرّ <span className="ltr">{category.data.aisle_code}</span></span>}
          <h2 className="cat-hero__title">{category.data.name_ar}</h2>
          {category.data.tagline_ar && <p className="cat-hero__text">{category.data.tagline_ar}</p>}
          <span className="cat-hero__art" aria-hidden="true"><Art className="die-cut" /></span>
        </header>
      )}

      <div className="toolbar">
        <span className="toolbar__count">
          {list.loading ? 'جارٍ التحميل…' : <><span className="numeral">{num(total ?? 0)}</span> صنفًا</>}
        </span>
        <div className="row" style={{ gap: 'var(--s-2)' }}>
          <button type="button" className="chip" onClick={() => setSortOpen(true)} aria-haspopup="dialog">
            <IconSort size={16} /> {SORTS.find(([value]) => value === sort)?.[1] ?? 'ترتيب'}
          </button>
          <button
            type="button"
            className={`chip${activeChips.length ? ' is-active' : ''}`}
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
          >
            <IconFilter size={16} /> تصفية
            {activeChips.length > 0 && <span className="chip__count">{activeChips.length}</span>}
          </button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="chip-row" style={{ marginBlockEnd: 'var(--s-3)' }}>
          {activeChips.map((chip) => (
            <button key={chip.key} type="button" className="chip" onClick={() => setParam(chip.key, null)} aria-label={`إزالة ${chip.label}`}>
              {chip.label} <IconClose size={13} />
            </button>
          ))}
        </div>
      )}

      {list.loading && <GridSkeleton count={6} />}

      {!list.loading && list.error && <ErrorState error={list.error} onRetry={list.refresh} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={search ? 'لم نجد ما يطابق بحثك' : 'لا أصناف هنا بعد'}
          text={activeChips.length ? 'جرّب إزالة بعض المرشّحات.' : search ? 'جرّب كلمة أخرى، أو تصفّح الأقسام.' : 'ستظهر الأصناف فور إضافتها إلى هذا الفرع.'}
          actionLabel={activeChips.length ? 'مسح المرشّحات' : undefined}
          onClick={activeChips.length ? () => setParams(search ? { search } : {}, { replace: true }) : undefined}
        />
      )}

      {!list.loading && list.items.length > 0 && (
        <>
          <div className="pgrid">
            {list.items.map((product) => <ProductTile key={product.id} product={product} />)}
          </div>

          {list.hasMore && (
            <button type="button" className="btn btn--outline btn--block" style={{ marginBlockStart: 'var(--s-5)' }} onClick={list.loadMore} disabled={list.loadingMore}>
              {list.loadingMore ? <span className="spinner" /> : 'عرض المزيد'}
            </button>
          )}

          {category.data?.price_range?.min_price != null && (
            <p className="text-xs muted" style={{ textAlign: 'center', marginBlockStart: 'var(--s-5)' }}>
              أسعار هذا القسم بين <span className="ltr">{money(category.data.price_range.min_price)}</span>
              {' '}و<span className="ltr">{money(category.data.price_range.max_price)}</span>.
            </p>
          )}
        </>
      )}

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="ترتيب حسب">
        <div className="stack--tight">
          {SORTS.map(([value, label]) => (
            <label key={value} className={`option${sort === value ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="sort"
                checked={sort === value}
                onChange={() => { setParam('sort', value === 'featured' ? null : value); setSortOpen(false); }}
              />
              <span className="option__body"><span className="option__title">{label}</span></span>
            </label>
          ))}
        </div>
      </Sheet>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        params={params}
        showCategories={!slug}
        categories={categories}
        onApply={(next) => { setParams(next, { replace: true }); setFiltersOpen(false); }}
      />
    </Screen>
  );
}

/**
 * ورقة التصفية — تعمل على مسودّة محلية، ولا تمسّ الرابط إلا عند
 * «عرض النتائج». الترتيب والبحث يُحفظان كما هما.
 */
function FilterSheet({ open, onClose, params, onApply, showCategories, categories }) {
  const [draft, setDraft] = useState(() => new URLSearchParams(params));

  // كل فتحٍ يبدأ من حالة الرابط الحالية، لا من مسودّة أُلغيت
  useEffect(() => {
    if (open) setDraft(new URLSearchParams(params));
  }, [open, params]);

  const toggle = (key, value) => {
    const next = new URLSearchParams(draft);
    if (next.get(key) === String(value)) next.delete(key);
    else next.set(key, String(value));
    setDraft(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    for (const key of ['search', 'sort']) if (draft.get(key)) next.set(key, draft.get(key));
    setDraft(next);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="تصفية"
      footer={(
        <>
          <button type="button" className="btn btn--outline" onClick={clearAll}>مسح الكل</button>
          <button type="button" className="btn btn--primary grow" onClick={() => onApply(draft)}>عرض النتائج</button>
        </>
      )}
    >
      {showCategories && categories.length > 0 && (
        <FilterGroup title="القسم">
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              className={`chip${draft.get('category') === category.slug ? ' is-active' : ''}`}
              onClick={() => toggle('category', category.slug)}
            >
              {category.name_ar}
              {category.products_count > 0 && <span className="chip__count">{category.products_count}</span>}
            </button>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="السعر (ج.م)">
        {PRICE_BANDS.map(([value, label]) => (
          <button key={value} type="button" className={`chip${draft.get('price') === value ? ' is-active' : ''}`} onClick={() => toggle('price', value)}>
            {label}
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="التقييم">
        {RATINGS.map((value) => (
          <button key={value} type="button" className={`chip${draft.get('min_rating') === String(value) ? ' is-active' : ''}`} onClick={() => toggle('min_rating', value)}>
            <span className="numeral">{value}</span> نجوم فأكثر
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="خصائص" wrap={false}>
        {TOGGLES.map(([key, label]) => (
          <label key={key} className="checkbox">
            <input type="checkbox" checked={draft.get(key) === 'true'} onChange={() => toggle(key, 'true')} />
            <span>{label}</span>
          </label>
        ))}
      </FilterGroup>
    </Sheet>
  );
}

function FilterGroup({ title, wrap = true, children }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--s-5)' }}>
      <legend className="field__label" style={{ marginBlockEnd: 'var(--s-2)' }}>{title}</legend>
      <div style={wrap ? { display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' } : undefined}>{children}</div>
    </fieldset>
  );
}
