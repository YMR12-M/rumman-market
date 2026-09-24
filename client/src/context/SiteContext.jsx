/**
 * ═══════════════════════════════════════════════════════════════
 *  بيانات المتجر الحقيقية
 *
 *  كل رقم أو اسم يخصّ هذا المتجر تحديدًا — عدد الفروع، بيانات
 *  التواصل، حدّ التوصيل المجاني، قواعد النقاط — يأتي من هنا لا من
 *  نصّ مكتوب في مكوّن.
 *
 *  لماذا يستحقّ ذلك سياقًا كاملًا؟ لأن البديل هو أن تكتب الواجهة
 *  «سبعة فروع» ثم يفتح المتجر بفرعين، فيقرأ الزائر ادّعاءً كاذبًا في
 *  أول سطر. الرقم الذي يأتي من القاعدة لا يكذب أبدًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useContext, useMemo } from 'react';
import { api } from '@/lib/api.js';
import { useAsync } from '@/hooks/index.js';

const SiteContext = createContext(null);

/** قيم افتراضية محايدة تُستخدم أثناء التحميل أو عند تعذّر الاتصال */
const FALLBACK = {
  brand: { name: 'رُمّان', tagline: '' },
  support: { phone: '', email: '' },
  loyalty: { points_per_egp: 1, point_value_egp: 0.05, max_redemption_percent: 50 },
  counts: { branches: 0, categories: 0, products: 0, governorates: 0 },
  since_year: null,
  free_delivery_from: null,
  announcements: [],
  store_open: true,
};

export function SiteProvider({ children }) {
  const { data, loading } = useAsync(() => api.get('/content/site', undefined, { auth: false }), []);

  const value = useMemo(() => {
    const site = data ?? FALLBACK;
    return {
      ...site,
      loading,
      /** هل يوجد ما يُعرض أصلًا؟ الصفحات تستخدمها لتقول الحقيقة بدل عرض فراغ */
      hasCatalog: site.counts.products > 0 && site.counts.branches > 0,
    };
  }, [data, loading]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite يجب أن يُستخدم داخل SiteProvider');
  return context;
};
