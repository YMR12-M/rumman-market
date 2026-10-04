/**
 * ═══════════════════════════════════════════════════════════════
 *  تسجيل عامل الخدمة
 *
 *  في نسخ الإنتاج وحدها. عاملٌ أمام خادم التطوير يعترض طلبات الوحدات
 *  ويقدّم نسخة الأمس من ملفٍّ عدّلته للتوّ، فيحوّل كل تحديث فوري إلى
 *  لغز. لذلك يفعل التطوير العكس: يزيل أي عامل تركته نسخة إنتاج فُتحت
 *  سابقًا على الأصل نفسه — وهذا بالضبط ما يحدث حين تُعاين `dist/` على
 *  الجهاز نفسه ثم تعود إلى `npm run dev`.
 *
 *  التسجيل تحسينٌ لا اعتماد: كل مسار فشل هنا يترك تطبيقًا يعمل تمامًا
 *  مع الشبكة.
 * ═══════════════════════════════════════════════════════════════
 */

const SW_URL = '/sw.js';

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    void unregisterAll();
    return;
  }

  // بعد `load` كي لا ينافس تثبيتُ العامل — الذي ينزّل قائمة التخزين
  // المسبق كاملة — أولَ شاشة على باقة الجوّال.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).catch((error) => {
      console.warn('تعذّر تسجيل عامل الخدمة:', error.message);
    });
  });
}

async function unregisterAll() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    // إلغاء التسجيل يترك الذاكرة خلفه؛ بدون هذا تكبر مع كل بناء.
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith('rumman-mobile-')).map((name) => caches.delete(name)));
    }
  } catch {
    // التخزين قد يكون محجوبًا تمامًا (تصفّح خاص). لا شيء هنا يستحق الإبلاغ.
  }
}
