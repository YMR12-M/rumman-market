import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';
import Rating from '@/components/ui/Rating.jsx';
import Stepper from '@/components/ui/Stepper.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import {
  IconHeart, IconCart, IconChevronLeft, IconCheck, IconLeaf,
  IconShield, IconTruck, IconStore, IconPin,
} from '@/lib/icons.jsx';
import { catalogService, reviewService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';
import { money, unitLabel, timeAgo, tagLabel } from '@/lib/format.js';

const TABS = [
  ['about', 'عن المنتج'],
  ['nutrition', 'القيم الغذائية'],
  ['storage', 'الحفظ والمصدر'],
  ['reviews', 'التقييمات'],
];

export default function ProductPage() {
  const { slug } = useParams();
  const { branchId, branch, branches, selectBranch } = useBranch();
  const { addItem, quantityOf } = useCart();
  const wishlist = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('about');

  const product = useAsync(() => catalogService.product(slug, branchId), [slug, branchId]);
  const item = product.data;

  const reviews = useAsync(
    () => (item?.id ? reviewService.forProduct(item.id, { limit: 8 }) : Promise.resolve(null)),
    [item?.id],
  );

  const price = Number(item?.effective_price ?? item?.price ?? 0);
  const compareAt = item?.compare_at_price ? Number(item.compare_at_price) : null;
  const stock = Number(item?.stock ?? 0);
  const outOfStock = stock <= 0;
  const inCart = item ? quantityOf(item.id) : 0;

  /** فروع أخرى يتوفّر فيها المنتج — بديل عملي عند نفاده هنا */
  const elsewhere = useMemo(
    () => (item?.availability ?? []).filter((row) => row.branch_id !== branchId && row.stock > 0),
    [item, branchId],
  );

  if (product.loading) {
    return (
      <div className="container section">
        <div className="pdp">
          <Skeleton height={0} style={{ aspectRatio: '1', height: 'auto' }} />
          <div className="stack">
            <Skeleton height={14} width="30%" />
            <Skeleton height={38} width="70%" />
            <Skeleton height={18} width="50%" />
            <Skeleton height={100} />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container section">
        <EmptyState title="لم نجد هذا المنتج" description="ربما حُذف أو تغيّر رابطه." actionLabel="تصفّح المتجر" actionTo="/shop" />
      </div>
    );
  }

  return (
    <>
      <div className="container">
        <nav className="crumbs">
          <Link to="/">الرئيسية</Link>
          <span aria-hidden="true"><IconChevronLeft size={12} /></span>
          <Link to={`/category/${item.category_slug}`}>{item.category_name}</Link>
          <span aria-hidden="true"><IconChevronLeft size={12} /></span>
          <span>{item.name_ar}</span>
        </nav>
      </div>

      <div className="container section--tight">
        <div className="pdp">
          {/* ── اللوحة البصرية ─────────────────────────────── */}
          <div className="pdp__media">
            <ProductPlate
              name={item.name_ar}
              motif={item.category_motif}
              accent={item.category_accent}
              categoryLatin={item.category_slug?.replace('-', ' ')}
            />

            <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-4)', flexWrap: 'wrap' }}>
              {Boolean(item.is_organic) && <span className="badge badge--organic"><IconLeaf size={12} /> عضوي معتمد</span>}
              {Boolean(item.is_fresh) && <span className="badge badge--ink">طازج يوميًا</span>}
              {Boolean(item.is_exclusive) && <span className="badge badge--outline">حصري في رُمّان</span>}
              {item.tags?.includes('best') && <span className="badge badge--saffron">الأكثر طلبًا</span>}
            </div>
          </div>

          {/* ── التفاصيل ──────────────────────────────────── */}
          <div>
            <span className="eyebrow">{item.brand_name || 'مختارات رُمّان'}</span>
            <h1 className="pdp__title">{item.name_ar}</h1>
            <p className="lede" style={{ fontSize: 'var(--t-base)' }}>{item.short_desc_ar}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
              <Rating value={item.rating_avg} count={item.rating_count} size={16} />
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>SKU {item.sku}</span>
            </div>

            <div className="pdp__price-row">
              <div className="price pdp__price">
                <span className="price__now">{Number(price).toLocaleString('en-US')}</span>
                <span className="price__cur">ج.م</span>
                {compareAt && <span className="price__was">{Number(compareAt).toLocaleString('en-US')}</span>}
              </div>
              <span className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                / {item.unit_size || unitLabel(item.unit)}
              </span>
              {compareAt && (
                <span className="badge badge--sale">وفّر {money(compareAt - price)}</span>
              )}
            </div>

            {/* حقائق سريعة */}
            <dl className="pdp__facts">
              <div className="pdp__fact"><dt>المصدر</dt><dd>{item.farm_or_maker || '—'}</dd></div>
              <div className="pdp__fact"><dt>بلد المنشأ</dt><dd>{item.origin_country || '—'}</dd></div>
              <div className="pdp__fact"><dt>الحجم</dt><dd>{item.unit_size || unitLabel(item.unit)}</dd></div>
              {item.aisle && <div className="pdp__fact"><dt>الممر في الفرع</dt><dd>{item.aisle}</dd></div>}
            </dl>

            {/* الشراء */}
            <div className="pdp__buy">
              {outOfStock ? (
                <div style={{ width: '100%' }}>
                  <strong style={{ color: 'var(--danger)' }}>نفد من {branch?.name_ar}</strong>
                  {elsewhere.length > 0 && (
                    <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>
                      متاح في {elsewhere.length} فروع أخرى — بدّل فرعك من القائمة أدناه.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Stepper value={quantity} min={1} max={Math.min(item.max_per_order, stock)} onChange={setQuantity} />

                  <button type="button" className="btn btn--primary" onClick={() => addItem(item, quantity)} style={{ flex: 1, minWidth: 180 }}>
                    <IconCart size={17} /> أضف إلى السلة · {money(price * quantity)}
                  </button>

                  <button
                    type="button"
                    className={`btn btn--outline${wishlist.has(item.id) ? ' is-on' : ''}`}
                    onClick={() => wishlist.toggle(item)}
                    aria-pressed={wishlist.has(item.id)}
                  >
                    <IconHeart size={17} filled={wishlist.has(item.id)} />
                  </button>
                </>
              )}
            </div>

            {inCart > 0 && (
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--success)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <IconCheck size={16} /> لديك {inCart} في السلة —{' '}
                <Link to="/cart" className="link-underline">مراجعة السلة</Link>
              </p>
            )}

            {!outOfStock && stock <= 8 && (
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--danger)' }}>بقي {stock} فقط في {branch?.name_ar}</p>
            )}

            {/* ضمانات */}
            <ul style={{ display: 'grid', gap: 'var(--s-3)', marginTop: 'var(--s-5)' }}>
              {[
                [IconTruck, `توصيل من ${branch?.name_ar ?? 'فرعك'} خلال ${branch?.avg_prep_minutes ?? 45} دقيقة تقريبًا`],
                [IconShield, 'استبدال أو استرداد فوري إن لم يعجبك المنتج'],
                [IconStore, 'يمكنك الاستلام من الفرع بدل التوصيل'],
              ].map(([Icon, text]) => (
                <li key={text} style={{ display: 'flex', gap: 'var(--s-3)', fontSize: 'var(--t-sm)', color: 'var(--text-muted)' }}>
                  <Icon size={17} style={{ color: 'var(--brand-text)', flexShrink: 0, marginTop: 3 }} />
                  {text}
                </li>
              ))}
            </ul>

            {/* التوفّر في الفروع */}
            <div style={{ marginTop: 'var(--s-6)' }}>
              <h4 style={{ marginBottom: 'var(--s-3)', fontSize: 'var(--t-base)' }}>التوفّر في الفروع</h4>
              <div className="pdp__availability">
                {(item.availability ?? []).map((row) => (
                  <button
                    key={row.branch_id}
                    type="button"
                    className={`pdp__branch-row${row.branch_id === branchId ? ' is-current' : ''}`}
                    onClick={() => selectBranch(row.branch_id)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconPin size={14} style={{ color: 'var(--brand-text)' }} />
                      {row.name_ar}
                    </span>
                    <span className={row.stock > 0 ? '' : 'muted'} style={{ fontSize: 'var(--t-xs)' }}>
                      {row.stock > 0 ? `متاح · ${money(row.price)}` : 'نفد'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── التبويبات ──────────────────────────────────────── */}
      <div className="container section--tight">
        <div className="tabs" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`tab${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}{key === 'reviews' && item.rating_count ? ` (${item.rating_count})` : ''}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '78ch' }}>
          {tab === 'about' && (
            <div className="stack">
              <p>{item.description_ar}</p>
              {item.allergens?.length > 0 && (
                <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                  <strong>مسبّبات حساسية محتملة:</strong> {item.allergens.join('، ')}.
                </p>
              )}
              {item.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                  {item.tags.map((tag) => <span className="badge badge--outline" key={tag}>{tagLabel(tag)}</span>)}
                </div>
              )}
            </div>
          )}

          {tab === 'nutrition' && (
            item.nutrition ? (
              <>
                <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                  القيم لكل {item.nutrition.serving ?? '100 جم'} — تقريبية وقد تختلف باختلاف الدفعة.
                </p>
                <dl className="pdp__facts">
                  {[
                    ['سعرات حرارية', `${item.nutrition.calories} كالوري`],
                    ['بروتين', `${item.nutrition.protein} جم`],
                    ['كربوهيدرات', `${item.nutrition.carbs} جم`],
                    ['دهون', `${item.nutrition.fat} جم`],
                    ['ألياف', `${item.nutrition.fiber ?? 0} جم`],
                    ['صوديوم', `${item.nutrition.sodium_mg ?? 0} مجم`],
                  ].map(([label, value]) => (
                    <div className="pdp__fact" key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              </>
            ) : <p className="muted">لا تنطبق القيم الغذائية على هذا المنتج.</p>
          )}

          {tab === 'storage' && (
            <dl className="pdp__facts" style={{ gridTemplateColumns: '1fr' }}>
              <div className="pdp__fact"><dt>طريقة الحفظ</dt><dd>{item.storage_ar}</dd></div>
              <div className="pdp__fact"><dt>مدّة الصلاحية التقريبية</dt><dd>{item.shelf_life_days} يومًا من تاريخ الإنتاج</dd></div>
              <div className="pdp__fact"><dt>المصدر</dt><dd>{item.farm_or_maker} — {item.origin_country}</dd></div>
              {item.barcode && <div className="pdp__fact"><dt>الباركود</dt><dd className="numeral">{item.barcode}</dd></div>}
            </dl>
          )}

          {tab === 'reviews' && (
            <div>
              {reviews.data?.distribution?.length > 0 && (
                <div className="rdist" style={{ marginBottom: 'var(--s-6)', maxWidth: 420 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const row = reviews.data.distribution.find((d) => d.rating === star);
                    const count = row?.total ?? 0;
                    const total = reviews.data.distribution.reduce((acc, d) => acc + d.total, 0) || 1;
                    return (
                      <div className="rdist__row" key={star}>
                        <span>{star} نجوم</span>
                        <div className="rdist__bar"><div className="rdist__fill" style={{ width: `${(count / total) * 100}%` }} /></div>
                        <span className="numeral muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(reviews.data?.items?.length ?? 0) === 0 ? (
                <p className="muted">لا توجد تقييمات مكتوبة بعد. التقييم متاح لمن اشترى المنتج واستلمه.</p>
              ) : (
                reviews.data.items.map((review) => (
                  <article className="review" key={review.id}>
                    <div className="review__head">
                      <div className="review__author">
                        <span className="avatar">{review.author_name?.charAt(0)}</span>
                        <div>
                          <strong style={{ fontSize: 'var(--t-sm)' }}>{review.author_name}</strong>
                          {Boolean(review.is_verified) && (
                            <span className="badge badge--organic" style={{ marginInlineStart: 8 }}>
                              <IconCheck size={11} /> شراء موثّق
                            </span>
                          )}
                          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{timeAgo(review.created_at)}</div>
                        </div>
                      </div>
                      <Rating value={review.rating} size={13} showValue={false} />
                    </div>
                    {review.title && <strong style={{ display: 'block', marginBottom: 4 }}>{review.title}</strong>}
                    <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{review.body}</p>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── يُشترى معه + مشابه ─────────────────────────────── */}
      {item.frequently_bought_together?.length > 0 && (
        <div className="container section--tight">
          <ProductRail
            eyebrow="عملاؤنا يضيفونه أيضًا"
            title="يُشترى معه عادةً"
            products={item.frequently_bought_together}
          />
        </div>
      )}

      {item.related?.length > 0 && (
        <div className="container section--tight" style={{ paddingBottom: 'var(--s-8)' }}>
          <ProductRail
            eyebrow={`من ${item.category_name}`}
            title="قد يعجبك أيضًا"
            products={item.related}
            actionLabel="كل القسم"
            actionTo={`/category/${item.category_slug}`}
          />
        </div>
      )}
    </>
  );
}
