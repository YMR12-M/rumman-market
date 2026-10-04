import { Link } from 'react-router-dom';
import { Fruit } from '@/lib/art.jsx';

/**
 * شعار رُمّان.
 * التركيب: رمّانة حمراء بتاج أصفر (ملصق بحدّ حبر) + الاسم بخط Kufam
 * العريض + الاسم اللاتيني بأرقام اللافتات متباعدًا تحته. لا مربّع
 * ملوّن حولها: الرمّانة نفسها هي الشكل المقصوص.
 */
export default function Logo({ inverse = false, size = 46, asLink = true }) {
  const content = (
    <>
      <span className="logo__badge">
        <Fruit size={size} />
      </span>
      <span className="logo__text">
        <span className="logo__ar">رُمّان</span>
        <span className="logo__en">RUMMAN</span>
      </span>
    </>
  );

  const className = `logo${inverse ? ' logo--inverse' : ''}`;

  return asLink
    ? <Link to="/" className={className} aria-label="رُمّان — الصفحة الرئيسية">{content}</Link>
    : <span className={className}>{content}</span>;
}
