/**
 * خطّافات لا يحتاجها إلا تطبيق الجوّال.
 *
 * الخطّافات العامة (useAsync وuseDebounce وغيرهما) في `hooks/index.js` —
 * نسخة حرفية من الواجهة المكتبية لا تُعدَّل هنا.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiReachable, onApiStatusChange } from '@/lib/api.js';

/**
 * هل مُرّرت الصفحة عن أعلاها؟ الشريط العلوي يستخدمها ليُظهر خطًّا
 * شعريًا، فلا يطفو شريطٌ شفّاف فوق المحتوى بلا ما يفصل بينهما.
 * الحالة لا تتغيّر إلا حين ينقلب الجواب، فلا إعادة رسم مع كل إطار.
 */
export function useCondensedHeader(threshold = 8) {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return condensed;
}

/**
 * حالة الاتصال: هل الجهاز متّصل بالشبكة، وهل يصل إلى الخادم؟
 * الأولى من المتصفّح، والثانية من طبقة الـ API التي ترصد كل طلب —
 * فشبكةٌ سليمة وخادمٌ متوقّف حالتان مختلفتان تستحقّان رسالتين مختلفتين.
 */
export function useConnection() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [apiReachable, setApiReachable] = useState(isApiReachable);

  useEffect(() => onApiStatusChange(setApiReachable), []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return { online, apiReachable };
}

/**
 * ═══════════════════════════════════════════════════════════════
 *  قائمة مرقّمة تتراكم صفحاتها
 *
 *  على الهاتف لا نعرض أزرار ترقيم: القائمة تطول بزرّ «عرض المزيد» في
 *  آخرها، وتعود إلى صفحتها الأولى متى تغيّرت المرشّحات.
 *
 *  `loader(page)` يرجع `{ items, meta }` كما يرجعه `api.paginated`.
 *  الطلبات المتأخرة تُهمل إن سبقها طلبٌ أحدث (سباق المرشّحات)، والعناصر
 *  المكرّرة تُسقط عند الدمج — فإضافة منتج جديد أثناء التصفّح تزيح
 *  الصفحات ولا يجوز أن تُظهر صنفًا مرّتين.
 * ═══════════════════════════════════════════════════════════════
 */
export function usePagedList(loader, deps = [], { key = (item) => item.id } = {}) {
  const [state, setState] = useState({ items: [], meta: null, loading: true, loadingMore: false, error: null });
  const requestRef = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async (page, append) => {
    const requestId = ++requestRef.current;
    setState((current) => ({ ...current, loading: !append, loadingMore: append, error: null }));
    try {
      const { items, meta } = await loaderRef.current(page);
      if (requestId !== requestRef.current) return;
      setState((current) => {
        let merged = items ?? [];
        if (append) {
          const seen = new Set(current.items.map(keyRef.current));
          merged = [...current.items, ...merged.filter((item) => !seen.has(keyRef.current(item)))];
        }
        return { items: merged, meta, loading: false, loadingMore: false, error: null };
      });
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setState((current) => ({ ...current, loading: false, loadingMore: false, error }));
    }
  }, []);

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const meta = state.meta;
  const hasMore = Boolean(meta && (meta.hasNext ?? meta.page < meta.totalPages));

  const loadMore = useCallback(() => {
    if (!hasMore || state.loadingMore) return;
    load((meta?.page ?? 1) + 1, true);
  }, [hasMore, state.loadingMore, meta, load]);

  const refresh = useCallback(() => load(1, false), [load]);

  return { ...state, hasMore, loadMore, refresh };
}
