import { Outlet } from 'react-router-dom';
import TabBar from './TabBar.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';

/**
 * الهيكل ذو التبويبات: شاشة تتمرّر وتحتها شريط التبويبات الثابت.
 * كل شاشة تزوّد شريطها العلوي بنفسها عبر `<Screen>`، فلا يحتاج الهيكل
 * إلى جدول عناوين قد يتخلّف عن الموجّه.
 */
export default function AppShell() {
  return (
    <div className="shell">
      <ConnectionBanner />
      <Outlet />
      <TabBar />
    </div>
  );
}
