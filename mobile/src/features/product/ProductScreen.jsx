import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ActionBar from '@/components/shell/ActionBar.jsx';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';
import Price from '@/components/product/Price.jsx';
import QtyControl from '@/components/ui/QtyControl.jsx';
import ReviewSheet from './ReviewSheet.jsx';
import { EmptyState, Skeleton, Stars } from '@/components/ui/Feedback.jsx';
import {
  IconCart, IconCheck, IconChevronDown, IconHeart, IconLeaf, IconPin, IconStar,
} from '@/lib/icons.jsx';
import { catalogService, reviewService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { money, num, tagLabel, timeAgo, unitLabel } from '@/lib/format.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  صفحة المنتج — شاشة مكدّسة بشريط شراء ثابت في أسفلها
 *
 *  ما يحتاجه القرار أولًا (السعر، الكمية، التوفّر في فرعك) في أعلى
 *  الشاشة وفي الشريط السفلي حيث الإبهام؛ والتفاصيل الطويلة (الوصف،
 *  القيم الغذائية، الحفظ، التقييمات) في أقسام تُطوى، لأن تبويبات
 *  أفقية على شاشة ضيّقة تخفي نصف عناوينها.
 *
 *  الكمية القصوى هي الأقلّ من حدّ الطلب ومخزون الفرع — القاعدة التي
 *  يطبّقها الخادم نفسه عند إنشاء الطلب.
 * ═══════════════════════════════════════════════════════════════
 */
export default function ProductScreen() {
  const { slug } = useParams();
  const { branchId, branch, selectBranch, openPicker } = useBranch();
  const { addItem, quantityOf } = useCart();
  const wishlist = useWishlist();
  const { isAuthenticated } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const product = useAsync(() => catalogService.product(slug, branchId), [slug, branchId]);
  const item = product.data;

  const reviews = useAsync(
    () => (item?.id ? reviewService.forProduct(item.id, { limit: 8 }) : Promise.resolve(null)),
    [item?.id],
  );

  // هل يحقّ لهذا العميل تقييم المنتج؟ الخادم يعرف: اشتراه واستلمه ولم يقيّمه بعد
  const pending = useAsync(
    () => (isAuthenticated ? reviewService.pending() : Promise.resolve([])),
    [isAuthenticated],
  );
  const canReview = Boolean(item && (pending.data ?? []).some((row) => row.id === item.id || row.product_id === item.id));

  const elsewhere = useMemo(
    () => (item?.availability ?? []).filter((row) => row.branch_id !== branchId && row.stock > 0),
    [item, branchId],
  );

  if (product.loading) {
    return (
      <Screen back stack actionbar>
        <Skeleton height={0} radius="var(--r-xl)" style={{ aspectRatio: '1', height: 'auto' }} />
        <Skeleton height={14} width="30%" style={{ marginTop: 'var(--s-5)' }} />
        <Skeleton height={30} width="80%" style={{ marginTop: 'var(--s-3)' }} />
        <Skeleton height={60} style={{ marginTop: 'var(--s-4)' }} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen back stack>
        <EmptyState title="لم نجد هذا المنتج" text="ربما حُذف أو تغيّر رابطه." actionLabel="تصفّح المتجر" to="/shop" />
      </Screen>
    );
  }

  const price = Number(item.effective_price ?? item.price ?? 0);
  const compareAt = item.compare_at_price ? Number(item.compare_at_price) : null;
  const stock = Number(item.stock ?? 0);
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, Math.min(item.max_per_order ?? 20, stock));
  const inCart = quantityOf(item.id);
  const favorite = wishlist.has(item.id);
  const unit = item.unit_size || unitLabel(item.unit);

  const add = async () => {
    setAdding(true);
    try { await addItem(item, quantity); setQuantity(1); } finally { setAdding(false); }
  };

  const distribution = reviews.data?.distribution ?? [];
  const distributionTotal = distribution.reduce((sum, row) => sum + row.total, 0) || 1;

  return (
    <Screen
      back
      stack
      actionbar
      title={item.name_ar}
      trailing={(
        <button
          type="button"
          className="icon-btn"
          onClick={() => wishlist.toggle(item)}
          aria-pressed={favorite}
          aria-label={favorite ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'}
          style={favorite ? { color: 'var(--brand)' } : undefined}
        >
          <IconHeart size={22} filled={favorite} />
        </button>
      )}
      onRefresh={product.reload}
    >
      <div className="pdp__media">
        <ProductPlate
          name={item.name_ar}
          motif={item.category_motif}
          accent={item.category_accent}
          categoryLatin={item.category_slug?.replace(/-/g, ' ')}
        />
      </div>

      <div className="pdp__badges">
        {compareAt && compareAt > price && <span className="badge badge--sale">وفّر <span className="ltr">{money(compareAt - price)}</span></span>}
        {Boolean(item.is_organic) && <span className="badge badge--organic"><IconLeaf size={12} /> عضوي معتمد</span>}
        {Boolean(item.is_fresh) && <span className="badge badge--ink">طازج يوميًا</span>}
        {Boolean(item.is_exclusive) && <span className="badge badge--outline">حصري في رُمّان</span>}
      </div>

      <span className="pdp__brand">{item.brand_name || item.category_name}</span>
      <h2 className="pdp__title">{item.name_ar}</h2>
      {item.short_desc_ar && <p className="pdp__desc">{item.short_desc_ar}</p>}

      <div className="pdp__price-row">
        <Price value={price} was={compareAt} large />
        <span className="muted text-sm">/ {unit}</span>
        <Stars value={item.rating_avg} count={item.rating_count} size={14} />
      </div>

      {outOfStock ? (
        <p className="notice notice--danger">
          نفد من {branch?.name_ar ?? 'فرعك'}.
          {elsewhere.length > 0 && <> متاح في <span className="numeral">{elsewhere.length}</span> فروع أخرى — بدّل فرعك من الأسفل.</>}
        </p>
      ) : stock <= 8 && (
        <p className="notice notice--warn">بقي <span className="numeral">{stock}</span> فقط في {branch?.name_ar}.</p>
      )}

      {inCart > 0 && (
        <p className="notice notice--success" style={{ marginBlockStart: 'var(--s-3)' }}>
          <IconCheck size={16} />
          <span>في سلتك <span className="numeral">{inCart}</span> — <Link to="/cart" className="link">مراجعة السلة</Link></span>
        </p>
      )}

      <dl className="pdp__facts" style={{ marginBlockStart: 'var(--s-4)' }}>
        {item.farm_or_maker && <div className="pdp__fact"><dt>المصدر</dt><dd>{item.farm_or_maker}</dd></div>}
        {item.origin_country && <div className="pdp__fact"><dt>بلد المنشأ</dt><dd>{item.origin_country}</dd></div>}
        <div className="pdp__fact"><dt>الحجم</dt><dd>{unit}</dd></div>
        {item.aisle && <div className="pdp__fact"><dt>الممرّ في الفرع</dt><dd>{item.aisle}</dd></div>}
      </dl>

      {(item.availability?.length ?? 0) > 1 && (
        <section style={{ marginBlockStart: 'var(--s-5)' }}>
          <h3 className="card__title">التوفّر في الفروع</h3>
          {item.availability.map((row) => (
            <button
              key={row.branch_id}
              type="button"
              className={`pdp__branch${row.branch_id === branchId ? ' is-current' : ''}`}
              onClick={() => selectBranch(row.branch_id)}
              aria-pressed={row.branch_id === branchId}
            >
              <span className="row" style={{ gap: 'var(--s-2)' }}>
                <IconPin size={16} className="text-brand" /> {row.name_ar}
              </span>
              <span className={row.stock > 0 ? 'text-xs' : 'text-xs muted'}>
                {row.stock > 0 ? <>متاح · <span className="ltr">{money(row.price)}</span></> : 'نفد'}
              </span>
            </button>
          ))}
        </section>
      )}

      <div style={{ marginBlockStart: 'var(--s-5)' }}>
        {item.description_ar && (
          <details className="accordion" open>
            <summary>عن المنتج <IconChevronDown size={18} /></summary>
            <div className="accordion__body stack--tight">
              <p>{item.description_ar}</p>
              {item.allergens?.length > 0 && (
                <p className="text-xs"><strong>مسبّبات حساسية محتملة:</strong> {item.allergens.join('، ')}.</p>
              )}
              {item.tags?.length > 0 && (
                <div className="row row--wrap" style={{ gap: 'var(--s-1)' }}>
                  {item.tags.map((tag) => <span key={tag} className="badge badge--outline">{tagLabel(tag)}</span>)}
                </div>
              )}
            </div>
          </details>
        )}

        {item.nutrition && (
          <details className="accordion">
            <summary>القيم الغذائية <IconChevronDown size={18} /></summary>
            <div className="accordion__body">
              <p className="text-xs muted" style={{ marginBlockEnd: 'var(--s-3)' }}>
                القيم لكل {item.nutrition.serving ?? '100 جم'} — تقريبية وقد تختلف باختلاف الدفعة.
              </p>
              <dl className="kv">
                {[
                  ['سعرات حرارية', item.nutrition.calories, 'كالوري'],
                  ['بروتين', item.nutrition.protein, 'جم'],
                  ['كربوهيدرات', item.nutrition.carbs, 'جم'],
                  ['دهون', item.nutrition.fat, 'جم'],
                  ['ألياف', item.nutrition.fiber, 'جم'],
                  ['صوديوم', item.nutrition.sodium_mg, 'مجم'],
                ].filter(([, value]) => value !== undefined && value !== null).map(([label, value, suffix]) => (
                  <div className="kv__row" key={label}><dt>{label}</dt><dd><span className="numeral">{num(value)}</span> {suffix}</dd></div>
                ))}
              </dl>
            </div>
          </details>
        )}

        {(item.storage_ar || item.shelf_life_days || item.barcode) && (
          <details className="accordion">
            <summary>الحفظ والمصدر <IconChevronDown size={18} /></summary>
            <div className="accordion__body">
              <dl className="kv kv--stacked">
                {item.storage_ar && <div className="kv__row"><dt>طريقة الحفظ</dt><dd>{item.storage_ar}</dd></div>}
                {item.shelf_life_days > 0 && (
                  <div className="kv__row"><dt>مدّة الصلاحية التقريبية</dt><dd><span className="numeral">{num(item.shelf_life_days)}</span> يومًا من تاريخ الإنتاج</dd></div>
                )}
                {item.barcode && <div className="kv__row"><dt>الباركود</dt><dd className="numeral ltr">{item.barcode}</dd></div>}
                {item.sku && <div className="kv__row"><dt>رمز الصنف</dt><dd className="numeral ltr">{item.sku}</dd></div>}
              </dl>
            </div>
          </details>
        )}

        <details className="accordion">
          <summary>
            <span>التقييمات {item.rating_count > 0 && <span className="numeral muted">({num(item.rating_count)})</span>}</span>
            <IconChevronDown size={18} />
          </summary>
          <div className="accordion__body">
            {distribution.length > 0 && (
              <div className="stack--tight" style={{ marginBlockEnd: 'var(--s-4)' }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution.find((row) => row.rating === star)?.total ?? 0;
                  return (
                    <div key={star} className="row text-xs">
                      <span style={{ minWidth: '5ch' }}><span className="numeral">{star}</span> نجوم</span>
                      <div className="progress grow"><div className="progress__fill" style={{ width: `${(count / distributionTotal) * 100}%` }} /></div>
                      <span className="numeral muted" style={{ minWidth: '3ch', textAlign: 'end' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {canReview && (
              <button type="button" className="btn btn--outline btn--block" onClick={() => setReviewOpen(true)} style={{ marginBlockEnd: 'var(--s-3)' }}>
                <IconStar size={16} /> قيّم هذا المنتج
              </button>
            )}

            {(reviews.data?.items?.length ?? 0) === 0 ? (
              <p className="muted text-sm">لا توجد تقييمات مكتوبة بعد. التقييم متاح لمن اشترى المنتج واستلمه.</p>
            ) : reviews.data.items.map((review) => (
              <article className="review" key={review.id}>
                <div className="row">
                  <span className="avatar" aria-hidden="true">{review.author_name?.charAt(0)}</span>
                  <div className="grow">
                    <strong className="text-sm">{review.author_name}</strong>
                    {Boolean(review.is_verified) && <span className="badge badge--organic" style={{ marginInlineStart: 6 }}><IconCheck size={11} /> شراء موثّق</span>}
                    <div className="text-xs muted">{timeAgo(review.created_at)}</div>
                  </div>
                  <Stars value={review.rating} size={12} />
                </div>
                {review.title && <strong className="text-sm" style={{ display: 'block', marginBlockStart: 'var(--s-2)' }}>{review.title}</strong>}
                {review.body && <p className="text-sm soft">{review.body}</p>}
              </article>
            ))}
          </div>
        </details>
      </div>

      {item.frequently_bought_together?.length > 0 && (
        <ProductRail eyebrow="عملاؤنا يضيفونه أيضًا" title="يُشترى معه عادةً" products={item.frequently_bought_together} />
      )}
      {item.related?.length > 0 && (
        <ProductRail eyebrow={`من ${item.category_name}`} title="قد يعجبك أيضًا" products={item.related} actionLabel="كل القسم" to={`/category/${item.category_slug}`} />
      )}

      <ActionBar>
        {outOfStock ? (
          <>
            <div className="actionbar__meta grow">
              <strong className="text-danger">غير متاح في فرعك</strong>
              <small>{branch?.name_ar}</small>
            </div>
            <button type="button" className="btn btn--outline" onClick={openPicker}>تغيير الفرع</button>
          </>
        ) : (
          <>
            <QtyControl value={quantity} onChange={setQuantity} min={1} max={maxQty} label={`كمية ${item.name_ar}`} />
            <button type="button" className="btn btn--primary btn--lg grow" onClick={add} disabled={adding}>
              {adding ? <span className="spinner" /> : <IconCart size={18} />}
              أضف · <span className="ltr">{money(price * quantity)}</span>
            </button>
          </>
        )}
      </ActionBar>

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        product={item}
        onDone={() => { reviews.reload(); pending.reload(); product.reload(); }}
      />
    </Screen>
  );
}
