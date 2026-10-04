import ProductTile from './ProductTile.jsx';
import { SectionHead, Skeleton } from '@/components/ui/Feedback.jsx';

/**
 * شريط منتجات أفقي بعنوانه.
 * يختفي كاملًا إن لم يرجع الخادم شيئًا: عنوانٌ فوق فراغ يعد العميل
 * بشيء لا وجود له — والمتجر يبدأ فارغًا عن قصد.
 */
export default function ProductRail({ title, eyebrow, products, loading, actionLabel, to }) {
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section aria-label={title}>
      <SectionHead title={title} eyebrow={eyebrow} actionLabel={actionLabel} to={to} />
      <div className="rail">
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="ptile" style={{ padding: 'var(--s-2)' }}>
              <Skeleton height={0} style={{ aspectRatio: '1', height: 'auto' }} />
              <Skeleton height={12} width="75%" style={{ marginTop: 'var(--s-3)' }} />
              <Skeleton height={12} width="40%" style={{ marginTop: 'var(--s-2)' }} />
            </div>
          ))
          : products.map((product) => <ProductTile key={product.id} product={product} />)}
      </div>
    </section>
  );
}
