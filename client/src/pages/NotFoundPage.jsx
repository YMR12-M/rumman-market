import { Link } from 'react-router-dom';
import { BrandMark } from '@/lib/motifs.jsx';

export default function NotFoundPage() {
  return (
    <div className="container notfound">
      <div className="notfound__code numeral">404</div>
      <BrandMark size={54} style={{ color: 'var(--gold-400)', margin: '0 auto var(--s-5)' }} />
      <h1 style={{ fontSize: 'var(--t-xl)' }}>هذه الصفحة ليست على أي رفّ عندنا</h1>
      <p className="lede" style={{ marginInline: 'auto', marginTop: 'var(--s-3)' }}>
        ربما تغيّر الرابط أو حُذفت الصفحة. جرّب البحث، أو ابدأ من الأقسام.
      </p>
      <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'center', marginTop: 'var(--s-6)', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn--primary">الصفحة الرئيسية</Link>
        <Link to="/shop" className="btn btn--outline">تصفّح المتجر</Link>
      </div>
    </div>
  );
}
