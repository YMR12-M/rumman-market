import { Link } from 'react-router-dom';
import { BrandMark } from '@/lib/motifs.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * بطل الصفحة الرئيسية.
 *
 * التركيب: كتلة ليلية خمرية تملأ العرض، عليها نصّ عاجي كبير، وذهبٌ
 * يظهر في الخطّ الفاصل وفي الرقم البطل فقط. الياقوت يبقى للفعل
 * (زرّ التسوّق) — فيلمع لأنه الشيء الوحيد الملوّن بقوّة في المشهد.
 *
 * وكل رقم هنا حقيقي. لو كان في المتجر فرعٌ واحد قال «فرع واحد»،
 * ولو كان فارغًا اختفت الأرقام كلها بدل ادّعاء كتالوج لا وجود له.
 */
export default function Hero() {
  const { counts, since_year: since, free_delivery_from: freeFrom, brand, hasCatalog } = useSite();

  /** لا نعرض إلّا ما له قيمة فعلية — الصفر لا يُعرض */
  const stats = [
    counts.branches > 0 && [
      num(counts.branches),
      counts.governorates > 1 ? `فروع في ${num(counts.governorates)} محافظات` : counts.branches === 1 ? 'فرع يخدمك' : 'فروع تخدمك',
    ],
    counts.categories > 0 && [num(counts.categories), counts.categories === 1 ? 'قسم متخصّص' : 'أقسام متخصّصة'],
    counts.products > 0 && [`${num(counts.products)}`, 'صنفًا مُنتقى'],
  ].filter(Boolean);

  return (
    <section className="hero">
      <div className="hero__glow" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="hero__text">
          <span className="eyebrow eyebrow--onDark">
            {since ? `مائدة تستحقّ الأفضل · منذ ${since}` : brand.tagline || 'مائدة تستحقّ الأفضل'}
          </span>

          <h1 className="hero__title">
            {/* العبارة الأولى لا تُكسَر — كسرها في منتصفها يشوّه السطر */}
            <span>سوق مليان</span>
            <em>بالخير.</em>
          </h1>

          <p className="hero__lede">
            قشرةٌ واحدة تضمّ حبّاتٍ كثيرة — هكذا نرى المتجر: سقفٌ واحد وأقسامٌ لكلٍّ منها
            معياره. نختار الصنف بأنفسنا، ونكتب مصدره على بطاقته.
          </p>

          <div className="hero__cta">
            <Link to="/shop" className="btn btn--primary btn--lg">
              {hasCatalog ? 'ابدأ التسوّق' : 'تصفّح المتجر'}
            </Link>
            <Link to="/about" className="btn btn--gilded btn--lg">كيف نختار منتجاتنا</Link>
          </div>

          {freeFrom > 0 && (
            <p className="hero__note">
              توصيل مجاني للطلبات فوق <strong className="numeral">{money(freeFrom)}</strong>
            </p>
          )}

          {stats.length > 0 && (
            <>
              <hr className="gilt-rule hero__rule" />
              <div className="hero__stats">
                {stats.map(([value, label]) => (
                  <div key={label}>
                    <div className="hero__stat-value numeral">{value}</div>
                    <div className="hero__stat-label">{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="hero__art-wrap" aria-hidden="true">
          <div className="hero__art">
            <div className="hero__art-ring" />
            <BrandMark size={190} seedColor="var(--gold-400)" />
            <span className="hero__art-caption">{brand.name} · {brand.tagline}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
