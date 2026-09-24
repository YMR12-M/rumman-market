import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  IconUser, IconPackage, IconPin, IconHeart, IconGift, IconBell,
  IconLogout, IconWallet, IconChart,
} from '@/lib/icons.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

import AccountOverview from './AccountOverview.jsx';
import OrdersPage from './OrdersPage.jsx';
import AddressesPage from './AddressesPage.jsx';
import WishlistPage from './WishlistPage.jsx';
import LoyaltyAccountPage from './LoyaltyAccountPage.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import ProfilePage from './ProfilePage.jsx';

/** روابط لوحة الحساب — مصدر واحد للتنقّل الجانبي */
const NAV = [
  ['/account', 'نظرة عامة', IconUser, true],
  ['/account/orders', 'طلباتي', IconPackage],
  ['/account/wishlist', 'المفضّلة', IconHeart],
  ['/account/addresses', 'عناويني', IconPin],
  ['/account/loyalty', 'نقاطي ومحفظتي', IconGift],
  ['/account/notifications', 'الإشعارات', IconBell],
  ['/account/profile', 'بياناتي', IconWallet],
];

export default function AccountPage() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="container section--tight">
      <span className="eyebrow">حسابك في رُمّان</span>
      <h1 style={{ marginBottom: 'var(--s-6)' }}>أهلًا، {user?.full_name?.split(' ')[0]}</h1>

      <div className="account">
        <nav className="account-nav" aria-label="أقسام الحساب">
          {NAV.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `account-nav__link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}

          {/* فريق العمل يصل للوحة التحكّم من هنا أيضًا، لا من الرابط المباشر فقط */}
          {isStaff && (
            <NavLink to="/admin" className="account-nav__link" style={{ color: 'var(--brand-text)' }}>
              <IconChart size={18} /> لوحة التحكّم
            </NavLink>
          )}

          <button type="button" className="account-nav__link" onClick={handleLogout} style={{ width: '100%' }}>
            <IconLogout size={18} /> تسجيل الخروج
          </button>
        </nav>

        <div>
          <Routes>
            <Route index element={<AccountOverview />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="loyalty" element={<LoyaltyAccountPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
