import { useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { IconPin, IconClock, IconTruck, IconPhone, IconStore, IconCheck } from '@/lib/icons.jsx';
import { ART } from '@/lib/art.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

/** صفحة الفروع: بطاقة تفصيلية لكل فرع + اختيار الفرع النشط */
export default function BranchesPage() {
  const { branches, branchId, selectBranch, detectNearest } = useBranch();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const detail = useAsync(
    () => (expanded ? catalogService.branch(expanded) : Promise.resolve(null)),
    [expanded],
  );

  const locate = async () => {
    setLocating(true);
    try {
      const nearest = await detectNearest();
      toast.success(`أقرب فرع إليك: ${nearest?.name_ar}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <header className="page-hero page-hero--sun">
        <div className="container page-hero__inner">
          <div>
            <span className="eyebrow">أين تجدنا</span>
            <h1>فروعنا، ومعيار واحد</h1>
            <p className="lede">
              كل فرع له شخصيته وتخصّصه، لكن معايير الاختيار والجودة واحدة في كل رفّ.
              اختر فرعك لتظهر لك الأسعار والتوفّر الحقيقي فيه.
            </p>
            <div className="page-hero__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={locate} disabled={locating}>
                <IconPin size={16} /> {locating ? 'جارٍ تحديد موقعك…' : 'اعثر على أقرب فرع لي'}
              </button>
            </div>
          </div>
          <div className="page-hero__art" aria-hidden="true">
            <div className="awning awning--lg" style={{ inlineSize: '100%', maxInlineSize: 380, rotate: '-2deg' }} />
            <ART.basket className="die-cut" style={{ position: 'absolute', inlineSize: 180, blockSize: 180, insetBlockEnd: 0, rotate: '8deg', '--cat-color': 'var(--ruby-500)' }} />
          </div>
        </div>
      </header>

      <div className="container section--tight">
        <div className="cats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {branches.map((branch) => (
            <article key={branch.id} className={`branch-card${branch.id === branchId ? ' is-active' : ''}`}>
              <span className="branch-card__awning awning awning--sm" aria-hidden="true" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s-3)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--t-md)' }}>{branch.name_ar}</h3>
                  <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{branch.tagline_ar}</p>
                </div>
                <span className="branch-card__code">{branch.code}</span>
              </div>

              {typeof branch.is_open_now === 'boolean' && (
                <span className={`door-sign ${branch.is_open_now ? 'is-open' : 'is-closed'}`}>
                  {branch.is_open_now ? 'مفتوح الآن' : 'مغلق الآن'}
                </span>
              )}

              <div className="branch-card__meta">
                <div><IconPin size={14} /> {branch.address_ar}</div>
                <div>
                  <IconClock size={14} />
                  {branch.is_24h ? 'مفتوح ٢٤ ساعة' : `${String(branch.opens_at).slice(0, 5)} — ${String(branch.closes_at).slice(0, 5)}`}
                </div>
                <div><IconTruck size={14} /> توصيل {money(branch.delivery_fee)} · مجاني فوق {money(branch.free_delivery_over)}</div>
                <div><IconStore size={14} /> {num(branch.area_sqm)} م² · افتُتح {branch.opened_year}</div>
                {branch.distance_km != null && <div><IconPin size={14} /> يبعد {branch.distance_km} كم عنك</div>}
                <div><IconPhone size={14} /> <span className="numeral">{branch.phone}</span></div>
              </div>

              {expanded === branch.slug && detail.data && (
                <div style={{ borderTop: '2px dashed var(--line-strong)', paddingTop: 'var(--s-3)', fontSize: 'var(--t-sm)' }}>
                  <strong style={{ display: 'block', marginBottom: 6 }}>مناطق التوصيل</strong>
                  {(detail.data.delivery_zones ?? []).map((zone) => (
                    <div key={zone.id} className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-xs)', paddingBlock: 3 }}>
                      <span>{zone.name_ar}</span>
                      <span className="numeral">{money(zone.delivery_fee)} · {zone.eta_minutes} دقيقة</span>
                    </div>
                  ))}
                  <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-3)' }}>
                    {num(detail.data.stats?.products_count ?? 0)} صنفًا متاحًا في هذا الفرع.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                {branch.id === branchId ? (
                  <span className="btn btn--outline btn--sm" style={{ pointerEvents: 'none' }}>
                    <IconCheck size={14} /> فرعك الحالي
                  </span>
                ) : (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => selectBranch(branch.id)}>
                    تسوّق من هذا الفرع
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setExpanded(expanded === branch.slug ? null : branch.slug)}
                >
                  {expanded === branch.slug ? 'إخفاء التفاصيل' : 'مناطق التوصيل'}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <SectionHead
            eyebrow="نتوسّع"
            title="فرعك القادم قد يكون عندك"
            description="نخطّط لفروع جديدة بناءً على طلبات العملاء. أخبرنا أين تحبّ أن نفتح."
          />
          <Link to="/contact" className="btn btn--primary">اقترح موقعًا</Link>
        </div>
      </div>
    </>
  );
}
