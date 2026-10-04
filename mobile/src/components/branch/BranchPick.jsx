import { IconChevronDown, IconPin } from '@/lib/icons.jsx';
import { useBranch } from '@/context/BranchContext.jsx';

/**
 * زرّ «التسوّق من …» — يذكّر العميل دائمًا بالفرع الذي تتبعه الأسعار،
 * ويفتح ورقة اختيار الفرع.
 */
export default function BranchPick() {
  const { branch, loading, openPicker } = useBranch();

  return (
    <button type="button" className="branch-pick" onClick={openPicker} aria-haspopup="dialog">
      <span className="branch-pick__icon"><IconPin size={18} /></span>
      <span className="grow">
        <span className="branch-pick__label">التسوّق من</span>
        <span className="branch-pick__name">{loading ? '…' : branch?.name_ar ?? 'اختر فرعًا'}</span>
      </span>
      <IconChevronDown size={18} className="muted" />
    </button>
  );
}
