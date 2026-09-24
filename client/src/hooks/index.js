/**
 * خطّافات (Hooks) مشتركة — صغيرة ومحدّدة الغرض.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * كشف العناصر عند دخولها الشاشة.
 * يضيف الفئة is-visible مرة واحدة فقط ثم يتوقّف عن المراقبة.
 * يحترم تفضيل تقليل الحركة فيظهر كل شيء فورًا.
 */
export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      node.classList.add('is-visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/** تأخير قيمة متغيّرة — يمنع إرسال طلب بحث مع كل حرف */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** تنفيذ دالة عند النقر خارج عنصر (لإغلاق القوائم المنسدلة) */
export function useClickOutside(handler) {
  const ref = useRef(null);
  useEffect(() => {
    const listener = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);
  return ref;
}

/** الاستجابة لاستعلامات الوسائط داخل React */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

/**
 * جلب بيانات غير متزامن مع حالات التحميل والخطأ.
 * يتجاهل نتيجة الطلب القديم إن تغيّرت المدخلات (سباق الطلبات).
 *
 * @param {Function} loader دالة ترجع Promise
 * @param {Array} deps المدخلات التي تعيد التنفيذ عند تغيّرها
 */
export function useAsync(loader, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const activeRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++activeRef.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loader();
      if (requestId === activeRef.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (requestId === activeRef.current) setState({ data: null, loading: false, error });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { ...state, reload: run };
}

/** إغلاق شيء عند ضغط Escape */
export function useEscapeKey(handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const listener = (event) => event.key === 'Escape' && handler();
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [handler, active]);
}

/** منع تمرير الصفحة خلف الأدراج والنوافذ */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [locked]);
}
