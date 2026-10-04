import { useNavigate } from 'react-router-dom';
import { IconChevronRight } from '@/lib/icons.jsx';
import { useCondensedHeader } from '@/hooks/useMobile.js';

/**
 * الشريط العلوي الثابت لكل شاشة.
 *
 * زرّ الرجوع في بداية السطر (اليمين) وسهمه يشير إليها، كما في كل
 * تطبيق عربي. `back` قد يكون مسارًا محدّدًا؛ وإلا نرجع في السجلّ، فشاشةٌ
 * تُفتح من مكانين تعود إلى الذي جاءت منه لا إلى أحدهما دائمًا.
 */
export default function AppBar({ title, subtitle, back, lead, center, trailing }) {
  const navigate = useNavigate();
  const condensed = useCondensedHeader();

  const goBack = () => {
    if (typeof back === 'string') {
      navigate(back);
      return;
    }
    // أول شاشة في الجلسة (فُتحت من رابط مباشر) لا سجلّ قبلها
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <header className={`appbar${condensed ? ' is-condensed' : ''}`}>
      <div className="appbar__row">
        {back && (
          <div className="appbar__lead">
            <button type="button" className="icon-btn" onClick={goBack} aria-label="رجوع">
              <IconChevronRight size={24} />
            </button>
          </div>
        )}
        {lead && <div className="appbar__lead">{lead}</div>}

        {center ? (
          // محتوى حرّ في منتصف الشريط (حقل البحث مثلًا) يأخذ كل المساحة
          <div className="appbar__heading" style={{ display: 'flex', paddingInline: 0 }}>{center}</div>
        ) : (title || subtitle) ? (
          <div className="appbar__heading">
            {title && <h1 className="appbar__title">{title}</h1>}
            {subtitle && <p className="appbar__subtitle">{subtitle}</p>}
          </div>
        ) : (
          <div className="grow" />
        )}

        {trailing && <div className="appbar__trail">{trailing}</div>}
      </div>
    </header>
  );
}
