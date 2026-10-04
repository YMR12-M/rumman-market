import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ConfirmSheet from '@/components/ui/ConfirmSheet.jsx';
import {
  IconBell, IconChevronLeft, IconGift, IconHeart, IconLogout, IconMoon, IconPackage, IconPin,
  IconStore, IconSun, IconTag, IconUser, IconInfo,
} from '@/lib/icons.jsx';
import { IconClipboard, IconHelp } from '@/lib/mobile-icons.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useTheme } from '@/context/ThemeContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { money, num } from '@/lib/format.js';

export const TIER_LABELS = { silver: 'الفضّية', gold: 'الذهبية', platinum: 'البلاتينية' };

/**
 * ═══════════════════════════════════════════════════════════════
 *  تبويب «حسابي» — كل ما لا يحتاجه العميل كل يوم، على بُعد نقرة
 *
 *  للعضو: بطاقته (نقاطه ومحفظته وفئته) ثم صفوف حسابه. للزائر: دعوة
 *  للدخول، ومعها ما يفيده دون حساب (الفروع، الولاء، خدمة العملاء).
 *  وفريق الفرع يجد هنا مدخل «لوحة الفرع».
 * ═══════════════════════════════════════════════════════════════
 */
export default function AccountScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isStaff, logout, refreshUser } = useAuth();
  const { branch, openPicker } = useBranch();
  const { theme, toggle } = useTheme();
  const { loyalty } = useSite();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const points = Number(user?.loyalty_points ?? 0);
  const pointsValue = points * Number(loyalty?.point_value_egp ?? 0);

  return (
    <Screen title="حسابي" onRefresh={isAuthenticated ? refreshUser : undefined}>
      {isAuthenticated ? (
        <header className="card card--noir account-hero">
          <div>
            <h2 className="account-hero__name">{user.full_name}</h2>
            <span className="account-hero__tier">
              العضوية {TIER_LABELS[user.loyalty_tier] ?? ''}
            </span>
          </div>
          <div className="account-hero__stats">
            <Link to="/account/loyalty" className="account-hero__stat">
              <small>نقاط الولاء</small>
              <strong className="numeral">{num(points)}</strong>
              {pointsValue > 0 && <small>تساوي <span className="ltr">{money(pointsValue)}</span></small>}
            </Link>
            <Link to="/account/loyalty" className="account-hero__stat">
              <small>رصيد المحفظة</small>
              <strong className="numeral ltr">{money(user.wallet_balance ?? 0)}</strong>
            </Link>
          </div>
        </header>
      ) : (
        <section className="card card--noir auth-hero" style={{ marginBlockEnd: 0 }}>
          <h2 className="auth-hero__title">سجّل الدخول لتتابع طلباتك</h2>
          <p className="auth-hero__text">سلّتك ونقاطك وعناوينك في مكان واحد، على كل أجهزتك.</p>
          <div className="row" style={{ gap: 'var(--s-2)', marginBlockStart: 'var(--s-2)' }}>
            <Link to="/login" className="btn btn--lux">تسجيل الدخول</Link>
            <Link to="/register" className="btn btn--dark" style={{ border: '1px solid var(--lux-line)' }}>حساب جديد</Link>
          </div>
        </section>
      )}

      {isAuthenticated && (
        <>
          <h3 className="list-caption">حسابك</h3>
          <div className="list">
            <Row to="/orders" icon={IconPackage} tone="var(--teal-deep)" title="طلباتي" />
            <Row to="/account/wishlist" icon={IconHeart} tone="var(--brand-text)" title="المفضّلة" />
            <Row to="/account/addresses" icon={IconPin} tone="var(--emerald-deep)" title="عناويني" />
            <Row to="/account/loyalty" icon={IconGift} tone="var(--lux-text)" title="نقاطي ومحفظتي" />
            <Row to="/account/notifications" icon={IconBell} tone="var(--violet)" title="الإشعارات" />
            <Row to="/account/profile" icon={IconUser} tone="var(--text-soft)" title="بياناتي وكلمة المرور" />
          </div>
        </>
      )}

      {isStaff && (
        <>
          <h3 className="list-caption">فريق الفرع</h3>
          <div className="list">
            <Row to="/staff" icon={IconClipboard} tone="var(--brand-text)" title="لوحة الفرع" sub="الطابور وتحديث الحالات والتحويلات" />
          </div>
        </>
      )}

      <h3 className="list-caption">التسوّق</h3>
      <div className="list">
        <button type="button" className="list-row" onClick={openPicker}>
          <span className="list-row__icon"><IconStore size={18} /></span>
          <span className="list-row__body">
            <span className="list-row__title">الفرع</span>
            <span className="list-row__sub">{branch?.name_ar ?? 'اختر فرعًا'}</span>
          </span>
          <span className="list-row__trail">تغيير</span>
        </button>
        <button type="button" className="list-row" onClick={toggle} aria-pressed={theme === 'dark'}>
          <span className="list-row__icon">{theme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}</span>
          <span className="list-row__body">
            <span className="list-row__title">المظهر</span>
            <span className="list-row__sub">{theme === 'dark' ? 'الوضع الليلي' : 'الوضع الفاتح'}</span>
          </span>
          <span className="list-row__trail">{theme === 'dark' ? 'فاتح' : 'ليلي'}</span>
        </button>
        <Row to="/offers" icon={IconTag} tone="var(--plum)" title="العروض وأكواد الخصم" />
        <Row to="/branches" icon={IconPin} tone="var(--teal-deep)" title="فروعنا" />
        <Row to="/loyalty" icon={IconGift} tone="var(--lux-text)" title="برنامج الولاء" />
      </div>

      <h3 className="list-caption">رُمّان</h3>
      <div className="list">
        <Row to="/about" icon={IconInfo} tone="var(--text-soft)" title="عن رُمّان" sub="كيف نختار ما على الرفّ، والأسئلة الشائعة" />
        <Row to="/contact" icon={IconHelp} tone="var(--text-soft)" title="خدمة العملاء" />
      </div>

      {isAuthenticated && (
        <div className="list" style={{ marginBlockStart: 'var(--s-5)' }}>
          <button type="button" className="list-row list-row--danger" onClick={() => setConfirmLogout(true)}>
            <span className="list-row__icon"><IconLogout size={18} /></span>
            <span className="list-row__body"><span className="list-row__title">تسجيل الخروج</span></span>
          </button>
        </div>
      )}

      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => { await logout(); setConfirmLogout(false); navigate('/', { replace: true }); }}
        title="تسجيل الخروج؟"
        message="تبقى سلّتك محفوظة في حسابك وتعود إليها عند الدخول من جديد."
        confirmLabel="خروج"
        tone="primary"
      />
    </Screen>
  );
}

function Row({ to, icon: Icon, tone, title, sub }) {
  return (
    <Link to={to} className="list-row">
      <span className="list-row__icon" style={tone ? { '--tone': tone } : undefined}><Icon size={18} /></span>
      <span className="list-row__body">
        <span className="list-row__title">{title}</span>
        {sub && <span className="list-row__sub">{sub}</span>}
      </span>
      <span className="list-row__trail"><IconChevronLeft size={18} /></span>
    </Link>
  );
}
