import { Link } from 'react-router-dom';
import { OpenFruit, Fruit, Burst, Aril } from '@/lib/art.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { PROMISES } from '@/data/content.js';
import { money, num } from '@/lib/format.js';

/**
 * بطل الصفحة الرئيسية — واجهة محلّ لا صالة عرض.
 *
 * التركيب: ورقٌ كريمي، عنوان كبير بقلم تمييز أصفر، ورمّانة مفتوحة
 * حولها ملصقات وبطاقة معلّقة. والأرقام الحقيقية تُكتب على سبّورة
 * طباشير صغيرة كما تفعل المحلّات بأسعار اليوم.
 *
 * وكل رقم هنا حقيقي. لو كان في المتجر فرعٌ واحد قال «فرع واحد»،
 * ولو كان فارغًا اختفت السبّورة كلها بدل ادّعاء كتالوج لا وجود له.
 */
export default function Hero() {
  const { counts, since_year: since, free_delivery_from: freeFrom, brand, hasCatalog } = useSite();

  /** لا نعرض إلّا ما له قيمة فعلية — الصفر لا يُعرض */
  const board = [
    counts.branches > 0 && [counts.branches === 1 ? 'فرع واحد' : 'فروع', num(counts.branches)],
    counts.categories > 0 && [counts.categories === 1 ? 'قسم متخصّص' : 'أقسام متخصّصة', num(counts.categories)],
    counts.products > 0 && ['صنفًا مُنتقى', num(counts.products)],
  ].filter(Boolean);

  const freshPromise = PROMISES[0];

  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__text">
          <span className="eyebrow">
            {since ? `مائدة تستحقّ الأفضل · منذ ${since}` : brand.tagline || 'مائدة تستحقّ الأفضل'}
          </span>

          <h1 className="hero__title">
            {/* العبارة الأولى لا تُكسَر — كسرها في منتصفها يشوّه السطر */}
            <span>سوق مليان</span>
            <span className="hl">بالخير.</span>
          </h1>

          <p className="hero__lede">
            قشرةٌ واحدة تضمّ حبّاتٍ كثيرة — هكذا نرى المتجر: سقفٌ واحد وأقسامٌ لكلٍّ منها
            معياره. نختار الصنف بأنفسنا، ونكتب مصدره على بطاقته.
          </p>

          <div className="hero__cta">
            <Link to="/shop" className="btn btn--primary btn--lg">
              {hasCatalog ? 'ابدأ التسوّق' : 'تصفّح المتجر'}
            </Link>
            <Link to="/about" className="link-underline hero__more">كيف نختار منتجاتنا</Link>
          </div>

          {freeFrom > 0 && (
            <p className="hero__note">
              <Aril size={10} color="var(--brand)" />
              توصيل مجاني للطلبات فوق <strong className="price-num">{money(freeFrom).replace(' ج.م', '')}</strong> ج.م
            </p>
          )}
        </div>

        <div className="hero__art" aria-hidden="true">
          <div className="hero__disc halftone" />
          <OpenFruit size={430} className="hero__fruit" />
          <Fruit size={104} className="hero__whole hero__whole--a" />
          <Fruit size={70} className="hero__whole hero__whole--b" />

          <div className="hero__tag tag">
            <span className="hand">المصدر مكتوب عليه</span>
          </div>

          {freshPromise && (
            <Burst size={104} tone="sun" className="hero__burst">
              {freshPromise.title}
            </Burst>
          )}

          {board.length > 0 && (
            <div className="hero__board">
              <div className="hero__board-title">اليوم في {brand.name}</div>
              {board.map(([label, value]) => (
                <div className="leader" key={label}>
                  <span>{label}</span>
                  <b className="price-num">{value}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
