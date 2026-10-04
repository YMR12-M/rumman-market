import { Link, useLocation } from 'react-router-dom';
import { IconCart, IconGrid, IconPackage, IconUser } from '@/lib/icons.jsx';
import { IconHome } from '@/lib/mobile-icons.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { haptic } from '@/lib/haptics.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  شريط التبويبات — الوجهات الخمس اليومية
 *
 *  خمس لا أكثر: ما يُفتح كل يوم (التسوّق، الأقسام، السلة، الطلبات،
 *  الحساب). الفروع والعروض وقصّة رُمّان وخدمة العملاء تُستشار أحيانًا لا
 *  يوميًا، فتعيش في «حسابي» على بُعد نقرة واحدة. شريطٌ يحاول أن يحمل كل
 *  شيء ينتهي بألّا يحمل شيئًا يصيبه الإبهام.
 *
 *  `match` يضمّ الشاشات التي تُفتح من داخل التبويب، فيبقى مضيئًا وأنت
 *  داخل قسمٍ أو صفحة حساب فرعية.
 * ═══════════════════════════════════════════════════════════════
 */
const TABS = [
  { to: '/', label: 'الرئيسية', Icon: IconHome, exact: true },
  { to: '/categories', label: 'الأقسام', Icon: IconGrid, match: ['/category', '/offers'] },
  { to: '/cart', label: 'السلة', Icon: IconCart, badge: true },
  { to: '/orders', label: 'طلباتي', Icon: IconPackage },
  { to: '/account', label: 'حسابي', Icon: IconUser, match: ['/branches', '/about', '/contact', '/staff'] },
];

const within = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export default function TabBar() {
  const { pathname } = useLocation();
  const { cart } = useCart();
  const count = cart.items_count ?? 0;

  return (
    <nav className="tabbar" aria-label="التنقّل الرئيسي">
      {TABS.map(({ to, label, Icon, exact, badge, match = [] }) => {
        const active = exact ? pathname === to : [to, ...match].some((prefix) => within(pathname, prefix));
        return (
          <Link
            key={to}
            to={to}
            className={`tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => haptic('tap')}
          >
            <span className="tab__icon-wrap">
              <Icon size={24} strokeWidth={active ? 1.9 : 1.5} />
              {badge && count > 0 && (
                <span className="tab__badge numeral" aria-hidden="true">{count > 99 ? '99+' : count}</span>
              )}
            </span>
            <span>
              {label}
              {badge && count > 0 && <span className="visually-hidden">، فيها {count} صنفًا</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
