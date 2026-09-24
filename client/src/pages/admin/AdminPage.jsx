/**
 * ═══════════════════════════════════════════════════════════════
 *  هيكل لوحة الإدارة
 *
 *  شريط جانبي ثابت + منطقة محتوى تتبدّل بالمسار. الأقسام تُفلتَر
 *  حسب الدور: مدير الفرع يرى تشغيل فرعه (طلبات، مخزون، مدفوعات)
 *  ولا يرى ما يبني هوية المتجر (أقسام، كوبونات، مستخدمون، إعدادات).
 *
 *  التصفية هنا للراحة البصرية فقط — الخادم يفرض نفس الصلاحيات،
 *  فإخفاء زرٍّ ليس حماية.
 * ═══════════════════════════════════════════════════════════════
 */
import { Suspense, lazy } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  IconChart, IconStore, IconGrid, IconTag, IconBox, IconPackage,
  IconUsers, IconSettings, IconCreditCard, IconUpload, IconList, IconCoins,
} from '@/lib/icons.jsx';

const DashboardPage  = lazy(() => import('./DashboardPage.jsx'));
const BranchesPage   = lazy(() => import('./BranchesPage.jsx'));
const CategoriesPage = lazy(() => import('./CategoriesPage.jsx'));
const BrandsPage     = lazy(() => import('./BrandsPage.jsx'));
const ProductsPage   = lazy(() => import('./ProductsPage.jsx'));
const InventoryPage  = lazy(() => import('./InventoryPage.jsx'));
const ImportPage     = lazy(() => import('./ImportPage.jsx'));
const OrdersPage     = lazy(() => import('./OrdersPage.jsx'));
const PaymentsPage   = lazy(() => import('./PaymentsPage.jsx'));
const CouponsPage    = lazy(() => import('./CouponsPage.jsx'));
const PromotionsPage = lazy(() => import('./PromotionsPage.jsx'));
const UsersPage      = lazy(() => import('./UsersPage.jsx'));
const SettingsPage   = lazy(() => import('./SettingsPage.jsx'));

/** أقسام اللوحة — `admin: true` يعني للمدير العام وحده */
const NAV = [
  { group: 'التشغيل', items: [
    { to: '',           label: 'نظرة عامة',   icon: IconChart,       end: true },
    { to: 'orders',     label: 'الطلبات',      icon: IconPackage },
    { to: 'payments',   label: 'المدفوعات',    icon: IconCreditCard },
    { to: 'inventory',  label: 'المخزون',      icon: IconBox },
  ] },
  { group: 'الكتالوج', items: [
    { to: 'products',   label: 'المنتجات',     icon: IconList,   admin: true },
    { to: 'categories', label: 'الأقسام',      icon: IconGrid,   admin: true },
    { to: 'brands',     label: 'العلامات',     icon: IconTag,    admin: true },
    { to: 'import',     label: 'استيراد ملف',  icon: IconUpload, admin: true },
  ] },
  { group: 'المتجر', items: [
    { to: 'branches',   label: 'الفروع',       icon: IconStore,    admin: true },
    { to: 'coupons',    label: 'أكواد الخصم',  icon: IconCoins,    admin: true },
    { to: 'promotions', label: 'العروض',       icon: IconTag,      admin: true },
    { to: 'users',      label: 'المستخدمون',   icon: IconUsers,    admin: true },
    { to: 'settings',   label: 'الإعدادات',    icon: IconSettings, admin: true },
  ] },
];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();

  const visible = NAV
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.admin || isAdmin) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="admin">
      <aside className="admin__nav" aria-label="أقسام لوحة الإدارة">
        <div className="admin__brand">
          <span className="admin__brand-mark">إدارة</span>
          <div>
            <strong className="admin__brand-name">{user.full_name}</strong>
            <span className="admin__brand-role">
              {{ admin: 'مدير المنصّة', branch_manager: 'مدير فرع', staff: 'فريق التجهيز' }[user.role]}
            </span>
          </div>
        </div>

        {visible.map((section) => (
          <div key={section.group} className="admin__nav-group">
            <span className="admin__nav-label">{section.group}</span>
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to || 'root'}
                to={to ? `/admin/${to}` : '/admin'}
                end={end}
                className={({ isActive }) => `admin__link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      <div className="admin__content">
        <Suspense fallback={<div className="stack"><Skeleton height={80} /><Skeleton height={300} /></div>}>
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="orders"    element={<OrdersPage />} />
            <Route path="payments"  element={<PaymentsPage />} />
            <Route path="inventory" element={<InventoryPage />} />

            {isAdmin && <Route path="products"   element={<ProductsPage />} />}
            {isAdmin && <Route path="categories" element={<CategoriesPage />} />}
            {isAdmin && <Route path="brands"     element={<BrandsPage />} />}
            {isAdmin && <Route path="import"     element={<ImportPage />} />}
            {isAdmin && <Route path="branches"   element={<BranchesPage />} />}
            {isAdmin && <Route path="coupons"    element={<CouponsPage />} />}
            {isAdmin && <Route path="promotions" element={<PromotionsPage />} />}
            {isAdmin && <Route path="users"      element={<UsersPage />} />}
            {isAdmin && <Route path="settings"   element={<SettingsPage />} />}

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
