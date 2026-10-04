import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from '@/components/brand/Logo.jsx';
import SearchBar from './SearchBar.jsx';
import Drawer from '@/components/ui/Drawer.jsx';
import { Aril } from '@/lib/art.jsx';
import {
  IconCart, IconUser, IconHeart, IconPin, IconSun, IconMoon,
  IconMenu, IconChevronLeft, IconLogout, IconChart,
} from '@/lib/icons.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useTheme } from '@/context/ThemeContext.jsx';
import { useWishlist } from '@/context/WishlistContext.jsx';
import { onApiStatusChange, isApiReachable } from '@/lib/api.js';
import { useSite } from '@/context/SiteContext.jsx';


export default function Header() {
  const navigate = useNavigate();
  const { cart, openDrawer } = useCart();
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const { branch, openPicker, categories } = useBranch();
  const { theme, toggle } = useTheme();
  const site = useSite();
  const wishlist = useWishlist();

  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiDown, setApiDown] = useState(!isApiReachable());

  // ظل خفيف تحت الهيدر بعد التمرير — إشارة عمق بلا ضجيج
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /**
   * شريط الأخبار يعرض ما هو حقيقي فقط: عروضًا سارية في قاعدة
   * البيانات. لو لم يوجد شيء اكتفى بالجملة التعريفية، ولو لم توجد
   * اختفى الشريط — أفضل من شعار مكتوب في الكود لا يقابله عرضٌ قائم.
   */
  const announcements = useMemo(() => {
    const items = (site.announcements ?? []).filter((item) => item.text);
    if (items.length > 0) return items;
    return site.brand.tagline ? [{ text: site.brand.tagline }] : [];
  }, [site.announcements, site.brand.tagline]);

  /** نكرّر القائمة حتى يملأ كل نصف من الشريط عرض الشاشة فتبدو الحركة متّصلة */
  const tickerRun = useMemo(() => {
    if (announcements.length === 0) return [];
    const copies = Math.max(3, Math.ceil(9 / announcements.length));
    return Array.from({ length: copies }, () => announcements).flat();
  }, [announcements]);

  useEffect(() => onApiStatusChange((reachable) => setApiDown(!reachable)), []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <div className="announce ticker">
        <div className="announce__inner">
          {tickerRun.length > 0 && (
            <div className="ticker__viewport">
              <div className="ticker__track">
                {[0, 1].map((half) => (
                  <div key={half} style={{ display: 'flex' }} aria-hidden={half === 1 ? 'true' : undefined}>
                    {tickerRun.map((item, index) => (
                      <span className="ticker__item" key={index}>
                        <Aril size={8} color="currentColor" />
                        {item.href && half === 0 ? <Link to={item.href}>{item.text}</Link> : item.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <nav className="announce__links">
            <Link to="/branches">فروعنا</Link>
            <Link to="/offers">العروض</Link>
            <Link to="/about">عن {site.brand.name}</Link>
            <Link to="/contact">خدمة العملاء</Link>
          </nav>
        </div>
      </div>

      {/* مظلّة المحلّ: تتدلّى فوق اللافتة */}
      <div className="shopfront-awning" aria-hidden="true"><div className="awning" /></div>

      {apiDown && (
        <div className="conn-alert" role="status">
          تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت — سنعيد المحاولة تلقائيًا.
        </div>
      )}

      <header className={`header${stuck ? ' is-stuck' : ''}`}>
        <div className="container header__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
            <button type="button" className="icon-btn header__menu" onClick={() => setMenuOpen(true)} aria-label="القائمة">
              <IconMenu size={22} />
            </button>
            <Logo />
          </div>

          <SearchBar />

          <div className="header__actions">
            <button type="button" className="branch-pick" onClick={openPicker}>
              <IconPin size={16} style={{ color: 'var(--brand-text)' }} />
              <span className="branch-pick__text">
                <span className="branch-pick__label">التسوّق من</span>
                <span className="branch-pick__name">{branch?.name_ar ?? 'اختر فرعًا'}</span>
              </span>
            </button>

            {isStaff && (
              <Link to="/admin" className="staff-link" title="لوحة التحكّم">
                <IconChart size={16} />
                <span className="staff-link__text">لوحة التحكّم</span>
              </Link>
            )}

            <button type="button" className="icon-btn header__theme" onClick={toggle}
                    aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}>
              {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>

            <Link to="/account/wishlist" className="icon-btn" aria-label="المفضّلة">
              <IconHeart size={20} />
              {wishlist.count > 0 && <span className="count-dot">{wishlist.count}</span>}
            </Link>

            <Link to={isAuthenticated ? '/account' : '/login'} className="icon-btn" aria-label="حسابي">
              <IconUser size={20} />
            </Link>

            <button type="button" className="icon-btn" onClick={openDrawer} aria-label="سلة التسوّق">
              <IconCart size={20} />
              {cart.items_count > 0 && <span className="count-dot">{cart.items_count}</span>}
            </button>
          </div>
        </div>
      </header>

      <nav className="catnav" aria-label="أقسام المتجر">
        <div className="container">
          <ul className="catnav__list">
            <li>
              <NavLink to="/shop" className={({ isActive }) => `catnav__item${isActive ? ' is-active' : ''}`}>
                كل المنتجات
              </NavLink>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <NavLink
                  to={`/category/${category.slug}`}
                  className={({ isActive }) => `catnav__item${isActive ? ' is-active' : ''}`}
                >
                  <i className="catnav__dot" style={{ '--dot': category.accent_color }} aria-hidden="true" />
                  {category.name_ar}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* قائمة الموبايل */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="القائمة">
        {isAuthenticated && (
          <div className="card card--pad" style={{ marginBottom: 'var(--s-4)' }}>
            <strong style={{ fontFamily: 'var(--font-display)' }}>{user.full_name}</strong>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
              {user.loyalty_points} نقطة · العضوية {user.loyalty_tier === 'gold' ? 'الذهبية' : user.loyalty_tier === 'platinum' ? 'البلاتينية' : 'الفضّية'}
            </div>
          </div>
        )}

        <ul>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link to={`/category/${category.slug}`} className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                  <span className="mobile-nav__dot" style={{ background: category.accent_color }} />
                  {category.name_ar}
                </span>
                <IconChevronLeft size={16} />
              </Link>
            </li>
          ))}
        </ul>

        <ul style={{ marginTop: 'var(--s-5)' }}>
          {[['/branches', 'فروعنا'], ['/offers', 'العروض'], ['/about', 'عن رُمّان'], ['/loyalty', 'برنامج الولاء'], ['/contact', 'اتصل بنا']].map(([to, label]) => (
            <li key={to}>
              <Link to={to} className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
                {label}
                <IconChevronLeft size={16} />
              </Link>
            </li>
          ))}

          <li>
            <button type="button" className="mobile-nav__link" style={{ width: '100%' }} onClick={toggle}>
              {theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
          </li>

          {isStaff && (
            <li>
              <Link to="/admin" className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
                لوحة التحكّم <IconChart size={16} />
              </Link>
            </li>
          )}

          {isAuthenticated && (
            <li>
              <button type="button" className="mobile-nav__link" style={{ width: '100%' }} onClick={handleLogout}>
                تسجيل الخروج <IconLogout size={16} />
              </button>
            </li>
          )}
        </ul>
      </Drawer>
    </>
  );
}
