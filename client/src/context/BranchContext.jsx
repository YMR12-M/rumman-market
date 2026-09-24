/**
 * ═══════════════════════════════════════════════════════════════
 *  سياق الفرع — العمود الفقري لتجربة رُمّان
 *
 *  كل شيء يعتمد على الفرع المختار: الأسعار، التوفّر، رسوم التوصيل،
 *  وحتى الأقسام المعروضة. لذلك نحمّل الفرع قبل أي شيء آخر ونحفظه
 *  محليًا حتى لا نسأل العميل في كل زيارة.
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { catalogService } from '@/services/index.js';
import { storage, KEYS } from '@/lib/storage.js';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branchId, setBranchId] = useState(() => storage.get(KEYS.branchId));
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // تحميل الفروع مرة واحدة عند الإقلاع
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await catalogService.branches();
        if (cancelled) return;
        setBranches(list);

        // إن لم يكن هناك فرع محفوظ (أو حُذف) نختار الأول افتراضيًا
        const saved = storage.get(KEYS.branchId);
        const valid = list.some((branch) => branch.id === saved);
        const resolved = valid ? saved : list[0]?.id ?? null;
        setBranchId(resolved);
        storage.set(KEYS.branchId, resolved);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // الأقسام تتبع الفرع لأن عدّاد المنتجات يختلف بين الفروع
  useEffect(() => {
    if (!branchId) return;
    catalogService.categories(branchId).then(setCategories).catch(() => setCategories([]));
  }, [branchId]);

  const selectBranch = useCallback((id) => {
    setBranchId(id);
    storage.set(KEYS.branchId, id);
    setPickerOpen(false);
  }, []);

  /** ترتيب الفروع حسب قرب موقع العميل (بإذن المتصفّح) */
  const detectNearest = useCallback(
    () => new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('متصفّحك لا يدعم تحديد الموقع'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const nearest = await catalogService.nearestBranch(coords.latitude, coords.longitude);
            if (nearest?.id) selectBranch(nearest.id);
            resolve(nearest);
          } catch (error) {
            reject(error);
          }
        },
        () => reject(new Error('تعذّر الوصول إلى موقعك — اختر الفرع يدويًا')),
        { timeout: 8000 },
      );
    }),
    [selectBranch],
  );

  const branch = useMemo(
    () => branches.find((item) => item.id === branchId) ?? null,
    [branches, branchId],
  );

  const value = useMemo(() => ({
    branches, branch, branchId, categories, loading,
    pickerOpen, openPicker: () => setPickerOpen(true), closePicker: () => setPickerOpen(false),
    selectBranch, detectNearest,
  }), [branches, branch, branchId, categories, loading, pickerOpen, selectBranch, detectNearest]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch يجب أن يُستخدم داخل BranchProvider');
  return context;
};
