import { Link } from 'react-router-dom';
import { Fruit } from '@/lib/art.jsx';
import { IconCheck } from '@/lib/icons.jsx';
import { HOUSE_LABEL_POINTS } from '@/data/content.js';

/**
 * قصّة العلامة الخاصة.
 * على اليمين لوح كرافت عليه ملصق عبوة مثبّت بشريط لاصق (هكذا تبدو
 * علامتنا على الرفّ)، وعلى اليسار الاقتباس بخط اليد ونقاط الوعد.
 */
export default function BrandStory() {
  return (
    <div className="container story">
      <div className="story__panel reveal">
        <span className="tape" style={{ insetBlockStart: 16, insetInlineStart: 22, '--tape-tilt': '-8deg' }} />
        <span className="tape" style={{ insetBlockEnd: 18, insetInlineEnd: 22, '--tape-tilt': '-5deg' }} />

        <div className="story__label">
          <Fruit size={74} />
          <div className="story__label-title">مختارات رُمّان</div>
          <div className="story__label-hand">العلامة الخاصة</div>
          <div className="story__label-rule" />
          <div className="barcode" aria-hidden="true" />
        </div>
      </div>

      <div className="reveal" data-delay="2">
        <span className="eyebrow">مختارات رُمّان</span>
        <p className="story__quote">
          «حين لا نجد المنتج بالجودة التي نريدها، <span className="hl">نصنعه بأنفسنا.</span>
          مكوّن واحد، مصدر واحد، وجودة لا تتغيّر بين عبوة وأخرى.»
        </p>
        <p className="story__sig">— فريق المشتريات، رُمّان</p>

        <ul className="story__checks">
          {HOUSE_LABEL_POINTS.map((line) => (
            <li key={line}>
              <span className="story__tick"><IconCheck size={14} /></span>
              {line}
            </li>
          ))}
        </ul>

        <Link to="/about" className="btn btn--dark">
          اقرأ قصّتنا كاملة
        </Link>
      </div>
    </div>
  );
}
