import { useState } from 'react';
import Sheet from '@/components/ui/Sheet.jsx';
import { IconCheck, IconClock, IconPin, IconTruck } from '@/lib/icons.jsx';
import { IconLocate } from '@/lib/mobile-icons.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  اختيار الفرع — أهم قرار يتّخذه العميل في رُمّان
 *
 *  الأسعار والتوفّر ومواعيد التوصيل تتبع الفرع، فنعرض لكل فرع ما يغيّر
 *  قرار العميل فعلًا: هل هو مفتوح الآن، ورسوم التوصيل وحدّ المجاني،
 *  ومدّة التجهيز — وكلّها من قاعدة البيانات. و«أقرب فرع لي» يستخدم
 *  موقع الجهاز بإذن صاحبه، ولا يُطلب الإذن إلا حين يضغط الزرّ.
 * ═══════════════════════════════════════════════════════════════
 */
export default function BranchSheet() {
  const { branches, branchId, selectBranch, pickerOpen, closePicker, detectNearest } = useBranch();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    try {
      const nearest = await detectNearest();
      toast.success(nearest?.name_ar ? `اخترنا لك ${nearest.name_ar}` : 'اخترنا لك أقرب فرع');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  const choose = (id) => {
    selectBranch(id);
    const picked = branches.find((branch) => branch.id === id);
    if (picked && id !== branchId) toast.toast(`تتسوّق الآن من ${picked.name_ar}`);
  };

  return (
    <Sheet open={pickerOpen} onClose={closePicker} title="اختر فرعك">
      <p className="lede" style={{ marginBlockEnd: 'var(--s-4)' }}>
        الأسعار والتوفّر ومواعيد التوصيل تختلف من فرع لآخر. اختر الأقرب إليك.
      </p>

      {branches.length > 1 && (
        <button type="button" className="btn btn--outline btn--block" onClick={locate} disabled={locating} style={{ marginBlockEnd: 'var(--s-4)' }}>
          {locating ? <span className="spinner" /> : <IconLocate size={18} />}
          {locating ? 'جارٍ تحديد موقعك…' : 'اختر أقرب فرع لي'}
        </button>
      )}

      {branches.length === 0 && (
        <p className="notice notice--info">لا توجد فروع مفعّلة حتى الآن.</p>
      )}

      <div className="stack--tight">
        {branches.map((branch) => {
          const active = branch.id === branchId;
          return (
            <button
              key={branch.id}
              type="button"
              className={`option${active ? ' is-selected' : ''}`}
              onClick={() => choose(branch.id)}
              aria-pressed={active}
            >
              <span className="option__icon" style={{ '--tone': active ? 'var(--brand-text)' : 'var(--text-muted)' }}>
                {active ? <IconCheck size={20} /> : <IconPin size={20} />}
              </span>
              <span className="option__body">
                <span className="row row--between">
                  <span className="option__title">{branch.name_ar}</span>
                  <span className={`pill pill--${branch.is_24h || branch.is_open_now ? 'done' : 'cancel'}`}>
                    {branch.is_24h ? 'مفتوح ٢٤ ساعة' : branch.is_open_now ? 'مفتوح الآن' : 'مغلق الآن'}
                  </span>
                </span>
                {branch.address_ar && <span className="option__note">{branch.address_ar}</span>}
                <span className="option__note row row--wrap" style={{ gap: 'var(--s-1) var(--s-3)', marginBlockStart: 'var(--s-1)' }}>
                  <span className="row" style={{ gap: 4 }}>
                    <IconTruck size={14} />
                    {Number(branch.delivery_fee) > 0 ? <>توصيل <span className="ltr">{money(branch.delivery_fee)}</span></> : 'توصيل مجاني'}
                    {Number(branch.free_delivery_over) > 0 && <> · مجاني فوق <span className="ltr">{money(branch.free_delivery_over)}</span></>}
                  </span>
                  {branch.avg_prep_minutes > 0 && (
                    <span className="row" style={{ gap: 4 }}>
                      <IconClock size={14} /> التجهيز نحو <span className="numeral">{num(branch.avg_prep_minutes)}</span> دقيقة
                    </span>
                  )}
                  {branch.distance_km != null && (
                    <span className="row" style={{ gap: 4 }}>
                      <IconPin size={14} /> يبعد <span className="numeral">{num(branch.distance_km)}</span> كم
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
