/** مستطيل تحميل — نستخدمه بدل دوّارات التحميل لتقليل الوميض */
export function Skeleton({ height = 16, width = '100%', radius = 'var(--r-sm)', style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />;
}

/** هيكل بطاقة منتج — نفس أبعاد البطاقة الحقيقية لمنع قفز التخطيط */
export function ProductCardSkeleton() {
  return (
    <div className="pcard" aria-hidden="true">
      <Skeleton height={0} style={{ aspectRatio: '1', height: 'auto' }} />
      <div className="pcard__body">
        <Skeleton height={9} width="45%" />
        <Skeleton height={15} width="85%" />
        <Skeleton height={11} width="100%" />
        <div className="pcard__foot">
          <Skeleton height={20} width={70} />
          <Skeleton height={38} width={38} radius="var(--r-md)" />
        </div>
      </div>
    </div>
  );
}

/** شبكة هياكل أثناء تحميل قائمة المنتجات */
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="pgrid">
      {Array.from({ length: count }, (_, index) => <ProductCardSkeleton key={index} />)}
    </div>
  );
}
