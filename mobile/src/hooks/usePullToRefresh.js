import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics.js';

const THRESHOLD = 72;   // المسافة التي يتسلّح بعدها السحب
const MAX_PULL = 110;   // المؤشّر يتوقّف هنا مهما اشتدّ السحب
const RESISTANCE = 0.5; // المؤشّر يتحرّك نصف ما يتحرّكه الإصبع

/**
 * ═══════════════════════════════════════════════════════════════
 *  اسحب من أعلى الشاشة لتحديثها
 *
 *  الإيماءة التي يجرّبها كل مستخدم هاتف أولًا، ويجيبها تطبيق الويب
 *  عادةً بلا شيء — أو بإعادة تحميل الصفحة كلّها. هنا تعيد جلب بيانات
 *  الشاشة وحدها.
 *
 *  لا تعمل إلا والصفحة في أعلاها تمامًا وأول حركة للإصبع نزولًا؛ فسحبٌ
 *  أفقي عبر شريط منتجات، أو سحبٌ يبدأ من منتصف الصفحة، يُترك وشأنه.
 *  ولا نستدعي preventDefault على مستمع سلبي، فيبقى التمرير العادي على
 *  مساره السريع.
 * ═══════════════════════════════════════════════════════════════
 */
export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);
  // في مرجع كي لا نعيد ربط المستمعين كلما مرّر المستدعي دالة جديدة
  const handler = useRef(onRefresh);
  handler.current = onRefresh;

  const reset = useCallback(() => {
    tracking.current = false;
    armed.current = false;
    setDistance(0);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const onTouchStart = (event) => {
      if (refreshing || event.touches.length !== 1 || window.scrollY > 0) return;
      // داخل ورقة سفلية مفتوحة؟ السحب هناك لإغلاقها لا لتحديث الشاشة خلفها.
      if (event.target.closest?.('.sheet')) return;
      startY.current = event.touches[0].clientY;
      startX.current = event.touches[0].clientX;
      tracking.current = true;
      armed.current = false;
    };

    const onTouchMove = (event) => {
      if (!tracking.current) return;
      const deltaY = event.touches[0].clientY - startY.current;
      const deltaX = Math.abs(event.touches[0].clientX - startX.current);

      // عودة للأعلى أو سحب جانبي: ليس سحبًا للتحديث
      if (deltaY <= 0 || deltaX > Math.abs(deltaY)) {
        reset();
        return;
      }

      const pulled = Math.min(deltaY * RESISTANCE, MAX_PULL);
      setDistance(pulled);

      // طقّة واحدة لحظة تجاوز العتبة، فيُحسّ أن الإفلات سيفعل شيئًا
      if (!armed.current && pulled >= THRESHOLD) {
        armed.current = true;
        haptic('tap');
      }
    };

    const onTouchEnd = async () => {
      if (!tracking.current) return;
      const shouldRefresh = armed.current;
      tracking.current = false;
      armed.current = false;

      if (!shouldRefresh) {
        setDistance(0);
        return;
      }

      setRefreshing(true);
      setDistance(THRESHOLD);
      try {
        await handler.current?.();
      } finally {
        setRefreshing(false);
        setDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', reset);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [enabled, refreshing, reset]);

  return { distance, refreshing, armed: distance >= THRESHOLD };
}
