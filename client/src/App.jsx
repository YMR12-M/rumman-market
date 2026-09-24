import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Header from '@/components/layout/Header.jsx';
import Footer from '@/components/layout/Footer.jsx';
import CartDrawer from '@/components/cart/CartDrawer.jsx';
import BranchPicker from '@/components/layout/BranchPicker.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useRevealObserver } from '@/hooks/useRevealObserver.js';
import { BrandMark } from '@/lib/motifs.jsx';

/* تقسيم الحزمة: الصفحات الثقيلة تُحمّل عند الحاجة فقط */
const HomePage       = lazy(() => import('@/pages/HomePage.jsx'));
const ShopPage       = lazy(() => import('@/pages/ShopPage.jsx'));
const ProductPage    = lazy(() => import('@/pages/ProductPage.jsx'));
const CartPage       = lazy(() => import('@/pages/CartPage.jsx'));
const CheckoutPage   = lazy(() => import('@/pages/CheckoutPage.jsx'));
const BranchesPage   = lazy(() => import('@/pages/BranchesPage.jsx'));
const OffersPage     = lazy(() => import('@/pages/OffersPage.jsx'));
const AboutPage      = lazy(() => import('@/pages/AboutPage.jsx'));
const ContactPage    = lazy(() => import('@/pages/ContactPage.jsx'));
const LoyaltyPage    = lazy(() => import('@/pages/LoyaltyPage.jsx'));
const LoginPage      = lazy(() => import('@/pages/LoginPage.jsx'));
const RegisterPage   = lazy(() => import('@/pages/RegisterPage.jsx'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPasswordPage.jsx'));
const ResetPassword  = lazy(() => import('@/pages/ResetPasswordPage.jsx'));
const VerifyEmail    = lazy(() => import('@/pages/VerifyEmailPage.jsx'));
const AccountPage    = lazy(() => import('@/pages/account/AccountPage.jsx'));
const OrderPage      = lazy(() => import('@/pages/account/OrderDetailPage.jsx'));
const AdminPage      = lazy(() => import('@/pages/admin/AdminPage.jsx'));
const NotFoundPage   = lazy(() => import('@/pages/NotFoundPage.jsx'));

/** إعادة التمرير لأعلى عند تغيير المسار (سلوك متوقّع في المتاجر) */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

/** شاشة انتظار بعلامة البراند بدل دوّارة عامة */
function RouteFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: 'var(--gold-400)' }}>
      <BrandMark size={52} />
    </div>
  );
}

/** حماية المسارات التي تتطلّب تسجيل دخول (أو صلاحية فريق) */
function Protected({ children, staffOnly = false }) {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteFallback />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  // مراقب واحد يكشف كل عناصر .reveal في التطبيق
  useRevealObserver();

  return (
    <div className="app-shell">
      <ScrollToTop />
      <Header />

      <main className="app-main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/category/:slug" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/loyalty" element={<LoyaltyPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            <Route path="/checkout" element={<Protected><CheckoutPage /></Protected>} />
            <Route path="/account/orders/:orderNumber" element={<Protected><OrderPage /></Protected>} />
            <Route path="/account/*" element={<Protected><AccountPage /></Protected>} />
            <Route path="/admin/*" element={<Protected staffOnly><AdminPage /></Protected>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <CartDrawer />
      <BranchPicker />
    </div>
  );
}
