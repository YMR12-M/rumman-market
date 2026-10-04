import { useRef } from 'react';
import ProductCard from './ProductCard.jsx';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { IconChevronRight, IconChevronLeft } from '@/lib/icons.jsx';
import { ProductCardSkeleton } from '@/components/ui/Skeleton.jsx';

/**
 * شريط منتجات أفقي قابل للتمرير مع أزرار تنقّل.
 * نستخدم scrollBy بدل مكتبة سلايدر — أخفّ وأكثر انسيابية على الموبايل.
 */
export default function ProductRail({ eyebrow, title, description, actionLabel, actionTo, products, loading, skeletonCount = 5, tone }) {
  const trackRef = useRef(null);

  const scrollBy = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    // في RTL تكون قيم التمرير سالبة، لذا نضرب في اتجاه المستند
    const isRtl = document.documentElement.dir === 'rtl';
    track.scrollBy({ left: (isRtl ? -1 : 1) * direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className="rail">
      <SectionHead eyebrow={eyebrow} title={title} description={description} actionLabel={actionLabel} actionTo={actionTo} tone={tone}>
        <div className="rail__nav">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="السابق"><IconChevronRight size={18} /></button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="التالي"><IconChevronLeft size={18} /></button>
        </div>
      </SectionHead>

      <div className="rail__track" ref={trackRef}>
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => <ProductCardSkeleton key={index} />)
          : products.map((product, index) => (
              <ProductCard key={product.id} product={product} delay={(index % 5) + 1} />
            ))}
      </div>
    </section>
  );
}
