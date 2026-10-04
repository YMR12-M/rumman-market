import { Link } from 'react-router-dom';
import { ART } from '@/lib/art.jsx';

/** 404 كلافتة ممرّ: «الممرّ 404 — لا يوجد رفّ بهذا الاسم» */
export default function NotFoundPage() {
  return (
    <div className="container notfound">
      <div className="notfound__code">404</div>

      <div className="sign notfound__sign" style={{ '--cat-color': 'var(--brand)', '--cat-ink': '#fff' }}>
        <span className="sign__screw sign__screw--tl" />
        <span className="sign__screw sign__screw--tr" />
        <small>ممرّ غلط</small>
        هذه الصفحة ليست على أي رفّ عندنا
      </div>

      <div className="notfound__art" style={{ '--cat-color': 'var(--gold-400)' }} aria-hidden="true">
        <ART.basket className="die-cut" />
      </div>

      <p className="lede" style={{ marginInline: 'auto', marginTop: 'var(--s-4)' }}>
        ربما تغيّر الرابط أو حُذفت الصفحة. جرّب البحث، أو ابدأ من الأقسام.
      </p>
      <div style={{ display: 'flex', gap: 'var(--s-4)', justifyContent: 'center', marginTop: 'var(--s-6)', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn--primary">الصفحة الرئيسية</Link>
        <Link to="/shop" className="btn btn--outline">تصفّح المتجر</Link>
      </div>
    </div>
  );
}
