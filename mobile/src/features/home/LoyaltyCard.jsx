import { Link } from 'react-router-dom';
import { IconChevronLeft, IconGift } from '@/lib/icons.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * بطاقة الولاء الليلية.
 *
 * للعضو: رصيده الفعلي وقيمته بالجنيه. للزائر: القاعدة كما هي في
 * إعدادات المتجر (نقاط لكل جنيه) — لا رقم مكتوب في الكود، فالمصدر
 * الوحيد للحقيقة هو نفسه الذي يحسب النقاط عند الشراء.
 */
export default function LoyaltyCard() {
  const { user, isAuthenticated } = useAuth();
  const { loyalty } = useSite();

  if (isAuthenticated) {
    const points = Number(user?.loyalty_points ?? 0);
    const value = points * Number(loyalty?.point_value_egp ?? 0);

    return (
      <Link to="/account/loyalty" className="card card--noir loyalty-band">
        <span className="eyebrow">نقاط رُمّان</span>
        <span className="row row--between">
          <span>
            <span className="loyalty-band__points numeral">{num(points)}</span>
            <span className="loyalty-band__note" style={{ display: 'block' }}>
              نقطة{value > 0 && <> · تساوي <span className="ltr">{money(value)}</span> في طلبك التالي</>}
            </span>
          </span>
          <IconChevronLeft size={22} style={{ color: 'var(--gold-300)' }} />
        </span>
      </Link>
    );
  }

  return (
    <Link to="/register" className="card card--noir loyalty-band">
      <IconGift size={28} style={{ color: 'var(--gold-300)' }} />
      <span>
        <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>
          سجّل واجمع النقاط مع كل طلب
        </strong>
        {Number(loyalty?.points_per_egp) > 0 && (
          <span className="loyalty-band__note">
            <span className="numeral">{num(loyalty.points_per_egp)}</span> نقطة لكل جنيه، تُخصم من طلباتك القادمة.
          </span>
        )}
      </span>
      <span className="btn btn--sun btn--sm" style={{ justifySelf: 'start' }}>أنشئ حسابك</span>
    </Link>
  );
}
