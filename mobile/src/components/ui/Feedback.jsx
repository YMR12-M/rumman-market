/**
 * مكوّنات الحالة: التحميل، والفراغ، والخطأ، والتقييم، ورأس القسم.
 * صغيرة وكثيرة الاستخدام، فتعيش معًا.
 */
import { Component } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/lib/icons.jsx';
import { Aril } from '@/lib/art.jsx';
import { BrandMark } from '@/lib/motifs.jsx';

/** هيكل تحميل بشكل المحتوى القادم — أهدأ من دوّارة في منتصف الشاشة */
export function Skeleton({ height = 16, width = '100%', radius, style }) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ height, width, ...(radius ? { borderRadius: radius } : null), ...style }}
    />
  );
}

/** شبكة منتجات قيد التحميل */
export function GridSkeleton({ count = 6 }) {
  return (
    <div className="pgrid" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="ptile" style={{ padding: 'var(--s-2)' }}>
          <Skeleton height={0} style={{ aspectRatio: '1', height: 'auto' }} />
          <Skeleton height={12} width="80%" style={{ marginTop: 'var(--s-3)' }} />
          <Skeleton height={12} width="45%" style={{ marginTop: 'var(--s-2)' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * حالة فارغة تقول الحقيقة وتقترح الخطوة التالية.
 * `action` إمّا رابط (`to`) أو دالة (`onClick`).
 */
export function EmptyState({ icon, title, text, actionLabel, to, onClick, compact = false }) {
  return (
    <div className={`empty${compact ? ' empty--compact' : ''}`}>
      <div className="empty__mark">{icon ?? <BrandMark size={36} />}</div>
      <h2 className="empty__title">{title}</h2>
      {text && <p className="empty__text">{text}</p>}
      {actionLabel && to && <Link to={to} className="btn btn--primary">{actionLabel}</Link>}
      {actionLabel && onClick && !to && (
        <button type="button" className="btn btn--primary" onClick={onClick}>{actionLabel}</button>
      )}
    </div>
  );
}

/** خطأ في التحميل مع إعادة المحاولة */
export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      title={error?.offline ? 'تعذّر الاتصال' : 'حدث خطأ'}
      text={error?.message ?? 'تعذّر تحميل هذه الصفحة.'}
      actionLabel={onRetry ? 'إعادة المحاولة' : undefined}
      onClick={onRetry}
    />
  );
}

/** شاشة انتظار بعلامة البراند بدل دوّارة عامة */
export function RouteFallback() {
  return (
    <div className="route-fallback" aria-label="جارٍ التحميل" role="status">
      <BrandMark size={52} />
    </div>
  );
}

/** عنوان قسم داخل الشاشة، مع رابط «عرض الكل» اختياري */
export function SectionHead({ title, eyebrow, actionLabel, to }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="section-head__title">{title}</h2>
      </div>
      {actionLabel && to && (
        <Link to={to} className="section-head__action">
          {actionLabel} <IconChevronLeft size={14} />
        </Link>
      )}
    </div>
  );
}

/** عرض التقييم بالنجوم — للقراءة فقط */
export function Stars({ value = 0, count, size = 12 }) {
  const rating = Number(value) || 0;
  if (!rating && !count) return null;

  return (
    <span className="stars" aria-label={`التقييم ${rating.toFixed(1)} من 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Aril key={star} size={size - 2} color={star <= Math.round(rating) ? 'currentColor' : 'var(--ink-200)'} />
      ))}
      {count ? <span className="stars__count numeral">({count})</span> : null}
    </span>
  );
}

/**
 * حاجز أخطاء الرسم: خطأٌ في شاشة واحدة لا يُسقط التطبيق كلّه إلى
 * صفحة بيضاء، بل يعرض رسالة وطريقًا للعودة.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('خطأ في رسم الواجهة:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen screen--stack screen--bare">
        <EmptyState
          title="حدث خطأ غير متوقّع"
          text="أعد فتح التطبيق. إن تكرّر الأمر، تواصل مع خدمة العملاء."
          actionLabel="العودة إلى الرئيسية"
          onClick={() => { window.location.href = '/'; }}
        />
      </main>
    );
  }
}
