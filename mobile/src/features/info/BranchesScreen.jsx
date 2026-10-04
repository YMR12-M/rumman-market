import { useState } from 'react';
import Screen from '@/components/shell/Screen.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconClock, IconPhone, IconPin, IconTruck } from '@/lib/icons.jsx';
import { IconLocate } from '@/lib/mobile-icons.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * الفروع — بطاقة لكل فرع بما يهمّ من يقف على بابه: المواعيد، والتوصيل،
 * والهاتف (يتّصل بنقرة)، ومناطق التوصيل عند الطلب. كل رقم من القاعدة.
 */
export default function BranchesScreen() {
  const { branches, branchId, selectBranch, detectNearest, loading } = useBranch();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const detail = useAsync(() => (expanded ? catalogService.branch(expanded) : Promise.resolve(null)), [expanded]);

  const locate = async () => {
    setLocating(true);
    try {
      const nearest = await detectNearest();
      toast.success(nearest?.name_ar ? `أقرب فرع إليك: ${nearest.name_ar}` : 'اخترنا لك أقرب فرع');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen title="فروعنا" back="/account">
      {branches.length > 1 && (
        <button type="button" className="btn btn--outline btn--block" onClick={locate} disabled={locating} style={{ marginBlockEnd: 'var(--s-4)' }}>
          {locating ? <span className="spinner" /> : <IconLocate size={18} />}
          {locating ? 'جارٍ تحديد موقعك…' : 'اعثر على أقرب فرع لي'}
        </button>
      )}

      {loading && <Skeleton height={220} radius="var(--r-lg)" />}
      {!loading && branches.length === 0 && <EmptyState title="لا توجد فروع مفعّلة بعد" />}

      <div className="stack">
        {branches.map((branch) => {
          const active = branch.id === branchId;
          const open = expanded === branch.slug;
          return (
            <article key={branch.id} className={`branch-card stack--tight${active ? ' is-active' : ''}`}>
              <span className="branch-card__awning awning awning--sm" aria-hidden="true" />
              <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--t-md)' }}>{branch.name_ar}</h2>
                  {branch.tagline_ar && <p className="text-xs muted">{branch.tagline_ar}</p>}
                </div>
                {branch.code && <span className="branch-card__code">{branch.code}</span>}
              </div>

              <span className={`door-sign ${branch.is_24h || branch.is_open_now ? 'is-open' : 'is-closed'}`}>
                {branch.is_24h ? '٢٤ ساعة' : branch.is_open_now ? 'مفتوح الآن' : 'مغلق الآن'}
              </span>

              <ul className="stack--tight text-sm soft">
                {branch.address_ar && <li className="row" style={{ gap: 'var(--s-2)', alignItems: 'flex-start' }}><IconPin size={16} style={{ marginBlockStart: 4 }} /> {branch.address_ar}</li>}
                {!branch.is_24h && branch.opens_at && (
                  <li className="row" style={{ gap: 'var(--s-2)' }}>
                    <IconClock size={16} /> <span className="numeral ltr">{String(branch.opens_at).slice(0, 5)} — {String(branch.closes_at).slice(0, 5)}</span>
                  </li>
                )}
                <li className="row" style={{ gap: 'var(--s-2)' }}>
                  <IconTruck size={16} />
                  <span>
                    {Number(branch.delivery_fee) > 0 ? <>توصيل <span className="ltr">{money(branch.delivery_fee)}</span></> : 'توصيل مجاني'}
                    {Number(branch.free_delivery_over) > 0 && <> · مجاني فوق <span className="ltr">{money(branch.free_delivery_over)}</span></>}
                  </span>
                </li>
                {branch.distance_km != null && <li className="row" style={{ gap: 'var(--s-2)' }}><IconPin size={16} /> يبعد <span className="numeral">{num(branch.distance_km)}</span> كم عنك</li>}
              </ul>

              {open && detail.data && (
                <div style={{ borderBlockStart: '1px solid var(--line-soft)', paddingBlockStart: 'var(--s-3)' }}>
                  <strong className="text-sm">مناطق التوصيل</strong>
                  {(detail.data.delivery_zones ?? []).length === 0 && <p className="text-xs muted">لم تُحدَّد مناطق بعد.</p>}
                  {(detail.data.delivery_zones ?? []).map((zone) => (
                    <div key={zone.id} className="summary__row text-xs" style={{ paddingBlock: 3 }}>
                      <span>{zone.name_ar}</span>
                      <span><span className="ltr">{money(zone.delivery_fee)}</span>{zone.eta_minutes ? <> · <span className="numeral">{zone.eta_minutes}</span> دقيقة</> : null}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="row row--wrap" style={{ gap: 'var(--s-2)' }}>
                {active ? (
                  <span className="btn btn--outline btn--sm" aria-current="true"><IconCheck size={15} /> فرعك الحالي</span>
                ) : (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => { selectBranch(branch.id); toast.toast(`تتسوّق الآن من ${branch.name_ar}`); }}>
                    تسوّق من هذا الفرع
                  </button>
                )}
                {branch.phone && (
                  <a href={`tel:${branch.phone}`} className="btn btn--ghost btn--sm"><IconPhone size={15} /> اتصال</a>
                )}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setExpanded(open ? null : branch.slug)} aria-expanded={open}>
                  {open ? 'إخفاء المناطق' : 'مناطق التوصيل'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}
