import { useState } from 'react';
import Drawer from '@/components/ui/Drawer.jsx';
import { IconPin, IconClock, IconTruck, IconCheck } from '@/lib/icons.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money } from '@/lib/format.js';

/**
 * اختيار الفرع — أهم قرار يتخذه العميل في رُمّان.
 * نعرض حالة الفتح ورسوم التوصيل وحدّ الطلب لكل فرع، مع زر
 * «أقرب فرع لي» يستخدم موقع المتصفّح.
 */
export default function BranchPicker() {
  const { branches, branchId, selectBranch, pickerOpen, closePicker, detectNearest } = useBranch();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const handleDetect = async () => {
    setLocating(true);
    try {
      const nearest = await detectNearest();
      toast.success(`اخترنا لك ${nearest?.name_ar ?? 'أقرب فرع'}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Drawer open={pickerOpen} onClose={closePicker} title="اختر فرعك">
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        الأسعار والتوفّر ومواعيد التوصيل تختلف من فرع لآخر. اختر الأقرب إليك.
      </p>

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={handleDetect}
        disabled={locating}
        style={{ marginBottom: 'var(--s-5)' }}
      >
        <IconPin size={16} />
        {locating ? 'جارٍ تحديد موقعك…' : 'اختر أقرب فرع لي'}
      </button>

      <div className="stack">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            className={`branch-card${branch.id === branchId ? ' is-active' : ''}`}
            onClick={() => selectBranch(branch.id)}
            style={{ textAlign: 'start', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>{branch.name_ar}</strong>
                  {branch.id === branchId && <IconCheck size={16} style={{ color: 'var(--brand-text)' }} />}
                </div>
                <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>{branch.address_ar}</span>
              </div>
              <span className="branch-card__code">{branch.code}</span>
            </div>

            <div className="branch-card__meta">
              <div>
                <span className={`open-dot open-dot--${branch.is_open_now ? 'open' : 'closed'}`}>
                  {branch.is_24h ? 'مفتوح ٢٤ ساعة' : branch.is_open_now ? 'مفتوح الآن' : 'مغلق الآن'}
                </span>
              </div>
              <div><IconTruck size={14} /> توصيل {money(branch.delivery_fee)} · مجاني فوق {money(branch.free_delivery_over)}</div>
              <div><IconClock size={14} /> التجهيز خلال {branch.avg_prep_minutes} دقيقة تقريبًا</div>
              {branch.distance_km != null && (
                <div><IconPin size={14} /> يبعد عنك {branch.distance_km} كم</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </Drawer>
  );
}
