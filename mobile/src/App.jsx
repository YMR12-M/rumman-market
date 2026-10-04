import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/shell/AppShell.jsx';
import BranchSheet from '@/components/branch/BranchSheet.jsx';
import Screen from '@/components/shell/Screen.jsx';
import { EmptyState, RouteFallback } from '@/components/ui/Feedback.jsx';
import HomeScreen from '@/features/home/HomeScreen.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

/*
 * تقسيم الحزمة: الرئيسية وحدها في أول تحميل. الجوّال على باقة بيانات
 * يدفع ثمن كل كيلوبايت قبل أول رسم، ومعظم الجلسات تبدأ من الرئيسية.
 */
const CategoriesScreen = lazy(() => import('@/features/browse/CategoriesScreen.jsx'));
const ShopScreen = lazy(() => import('@/features/browse/ShopScreen.jsx'));
const SearchScreen = lazy(() => import('@/features/browse/SearchScreen.jsx'));
const OffersScreen = lazy(() => import('@/features/browse/OffersScreen.jsx'));
const ProductScreen = lazy(() => import('@/features/product/ProductScreen.jsx'));
const CartScreen = lazy(() => import('@/features/cart/CartScreen.jsx'));
const CheckoutScreen = lazy(() => import('@/features/checkout/CheckoutScreen.jsx'));
const OrdersScreen = lazy(() => import('@/features/orders/OrdersScreen.jsx'));
const OrderScreen = lazy(() => import('@/features/orders/OrderScreen.jsx'));
const AccountScreen = lazy(() => import('@/features/account/AccountScreen.jsx'));
const ProfileScreen = lazy(() => import('@/features/account/ProfileScreen.jsx'));
const AddressesScreen = lazy(() => import('@/features/account/AddressesScreen.jsx'));
const WishlistScreen = lazy(() => import('@/features/account/WishlistScreen.jsx'));
const LoyaltyScreen = lazy(() => import('@/features/account/LoyaltyScreen.jsx'));
const NotificationsScreen = lazy(() => import('@/features/account/NotificationsScreen.jsx'));
const BranchesScreen = lazy(() => import('@/features/info/BranchesScreen.jsx'));
const AboutScreen = lazy(() => import('@/features/info/AboutScreen.jsx'));
const ContactScreen = lazy(() => import('@/features/info/ContactScreen.jsx'));
const LoyaltyProgramScreen = lazy(() => import('@/features/info/LoyaltyProgramScreen.jsx'));
const LoginScreen = lazy(() => import('@/features/auth/LoginScreen.jsx'));
const RegisterScreen = lazy(() => import('@/features/auth/RegisterScreen.jsx'));
const ForgotPasswordScreen = lazy(() => import('@/features/auth/RecoveryScreens.jsx').then((m) => ({ default: m.ForgotPasswordScreen })));
const ResetPasswordScreen = lazy(() => import('@/features/auth/RecoveryScreens.jsx').then((m) => ({ default: m.ResetPasswordScreen })));
const VerifyEmailScreen = lazy(() => import('@/features/auth/RecoveryScreens.jsx').then((m) => ({ default: m.VerifyEmailScreen })));
const StaffScreen = lazy(() => import('@/features/staff/StaffScreen.jsx'));

/**
 * ═══════════════════════════════════════════════════════════════
 *  الموجّه
 *
 *  المسارات تطابق الواجهة المكتبية حيث وُجدت (‎/shop، ‎/category/:slug،
 *  ‎/product/:slug، ‎/account/…) — لأن الروابط التي يكتبها الخادم في
 *  الإشعارات والحملات والإعلانات مكتوبة بها، ويجب أن تفتح هنا كما هي.
 *  و«طلباتي» تبويب مستقل (‎/orders)، فمسارات الطلبات المكتبية تُحوَّل إليه.
 *
 *  الشاشات داخل الهيكل لها شريط تبويبات؛ الشاشات المكدّسة (المنتج،
 *  البحث، الدفع، الدخول) تأخذ الشاشة كلّها وشريط إجرائها في الأسفل.
 * ═══════════════════════════════════════════════════════════════
 */
export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="shop" element={<ShopScreen />} />
          <Route path="category/:slug" element={<ShopScreen />} />
          <Route path="offers" element={<OffersScreen />} />
          <Route path="cart" element={<CartScreen />} />

          <Route path="orders" element={<OrdersScreen />} />
          <Route path="orders/:orderNumber" element={<Protected><OrderScreen /></Protected>} />

          <Route path="account" element={<AccountScreen />} />
          <Route path="account/wishlist" element={<WishlistScreen />} />
          <Route path="account/profile" element={<Protected><ProfileScreen /></Protected>} />
          <Route path="account/addresses" element={<Protected><AddressesScreen /></Protected>} />
          <Route path="account/loyalty" element={<Protected><LoyaltyScreen /></Protected>} />
          <Route path="account/notifications" element={<Protected><NotificationsScreen /></Protected>} />
          <Route path="account/orders" element={<Navigate to="/orders" replace />} />
          <Route path="account/orders/:orderNumber" element={<LegacyOrderRedirect />} />

          <Route path="branches" element={<BranchesScreen />} />
          <Route path="about" element={<AboutScreen />} />
          <Route path="contact" element={<ContactScreen />} />
          <Route path="loyalty" element={<LoyaltyProgramScreen />} />

          <Route path="staff" element={<Protected staffOnly><StaffScreen /></Protected>} />
          <Route path="admin/*" element={<Navigate to="/staff" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="product/:slug" element={<ProductScreen />} />
        <Route path="search" element={<SearchScreen />} />
        <Route path="checkout" element={<Protected><CheckoutScreen /></Protected>} />

        <Route path="login" element={<PublicOnly><LoginScreen /></PublicOnly>} />
        <Route path="register" element={<PublicOnly><RegisterScreen /></PublicOnly>} />
        <Route path="forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="reset-password" element={<ResetPasswordScreen />} />
        <Route path="verify-email" element={<VerifyEmailScreen />} />
      </Routes>

      {/* متاحة من أي شاشة: الرئيسية، السلة، صفحة منتج نفد من الفرع */}
      <BranchSheet />
    </Suspense>
  );
}

/** الشاشات التي تحتاج حسابًا — ومعها ما يعيد العميل إليها بعد الدخول */
function Protected({ children, staffOnly = false }) {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteFallback />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (staffOnly && !isStaff) return <Navigate to="/account" replace />;
  return children;
}

/** الدخول والتسجيل لمن لم يدخل بعد؛ الداخل يذهب إلى وجهته مباشرة */
function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [params] = useSearchParams();

  if (loading) return <RouteFallback />;
  if (isAuthenticated) return <Navigate to={params.get('next') || '/account'} replace />;
  return children;
}

function LegacyOrderRedirect() {
  const { orderNumber } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/orders/${orderNumber}${search}`} replace />;
}

function NotFound() {
  return (
    <Screen title="غير موجودة" back>
      <EmptyState title="هذه الصفحة غير موجودة" text="ربما تغيّر الرابط أو حُذفت الصفحة." actionLabel="العودة إلى الرئيسية" to="/" />
    </Screen>
  );
}

/**
 * إعادة التمرير لأعلى عند الانتقال إلى شاشة جديدة.
 * الصفحة تتمرّر كلّها لا حاوية داخلها، فبدون هذا تفتح الشاشة التالية
 * من منتصفها. أما الرجوع (POP) فيترك المتصفّح يعيد الموضع السابق —
 * العائد من صفحة منتج يريد مكانه في القائمة.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
