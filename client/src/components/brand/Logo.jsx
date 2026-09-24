import { Link } from 'react-router-dom';
import { BrandMark } from '@/lib/motifs.jsx';

/**
 * شعار رُمّان.
 * التركيب: علامة الثمرة داخل مربّع ياقوتي + الاسم العربي بخط عريض
 * + الاسم اللاتيني متباعد تحته. المربّع الملوّن هو ما يجعل الشعار
 * يُرى فورًا على أي خلفية — وهو جوهر النبرة الحيوية للبراند.
 */
export default function Logo({ inverse = false, size = 40, asLink = true }) {
  const content = (
    <>
      <span className="logo__badge" style={{ width: size, height: size }}>
        <BrandMark size={size * 0.66} seedColor="var(--gold-400)" />
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
