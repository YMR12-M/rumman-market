import { Link } from 'react-router-dom';
import { BrandMark } from '@/lib/motifs.jsx';
import { IconCheck } from '@/lib/icons.jsx';
import { HOUSE_LABEL_POINTS } from '@/data/content.js';

/** قصّة العلامة الخاصة — لوحة داكنة منقّطة + اقتباس + نقاط */
export default function BrandStory() {
  return (
    <div className="container story">
      <div className="story__panel reveal">
        <BrandMark size={190} seedColor="var(--gold-400)" />
      </div>

      <div className="reveal" data-delay="2">
        <span className="eyebrow eyebrow--saffron">مختارات رُمّان</span>
        <p className="story__quote">
          «حين لا نجد المنتج بالجودة التي نريدها، نصنعه بأنفسنا.
          مكوّن واحد، مصدر واحد، وجودة لا تتغيّر بين عبوة وأخرى.»
        </p>
        <p className="story__sig">— فريق المشتريات، رُمّان</p>

        <ul style={{ marginTop: 'var(--s-5)', display: 'grid', gap: 'var(--s-3)' }}>
          {HOUSE_LABEL_POINTS.map((line) => (
            <li key={line} style={{ display: 'flex', gap: 'var(--s-3)', fontSize: 'var(--t-sm)' }}>
              <IconCheck size={18} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 3 }} />
              {line}
            </li>
          ))}
        </ul>

        <Link to="/about" className="btn btn--dark" style={{ marginTop: 'var(--s-5)' }}>
          اقرأ قصّتنا كاملة
        </Link>
      </div>
    </div>
  );
}
