/* ═══════════════════════════════════════════════════════════════
 *  رُمّان — عامل الخدمة لتطبيق الجوّال
 *
 *  مهمّتان: أن يُفتح التطبيق دون شبكة، وأن يستوفي شروط Chrome لتثبيته
 *  على الشاشة الرئيسية تطبيقًا حقيقيًا لا اختصارًا في المتصفّح.
 *
 *  والأهم هنا ما لا يُخزَّن. كل ما تحت /api بيانات حيّة ومخصّصة
 *  للمستخدم: الأسعار والتوفّر يتغيّران بين ساعة وأخرى، والسلّة والطلبات
 *  والمحفظة تخصّ صاحب الحساب وحده. نسخة مخزّنة ستعرض سعرًا قديمًا على
 *  أنه الحالي، وتترك بيانات حسابٍ في ذاكرة المتصفّح لمن يفتح الجوّال
 *  بعده. وكذلك /uploads: فيه إيصالات تحويل إنستاباي، ولا مكان لها في
 *  ذاكرة تخزين مشتركة. هذه الطلبات تمرّ إلى الشبكة كما هي، ولا يقرأ
 *  هذا العامل استجاباتها أصلًا.
 *
 *  مكتوب يدويًا لا بمكتبة، كبقية المشروع الذي لا يعتمد على مكتبات
 *  واجهة. قائمة التخزين المسبق هي الجزء الوحيد المولَّد: الإضافة في
 *  mobile/plugins/precache-plugin.js تستبدل العلامتين أدناه عند البناء.
 * ═══════════════════════════════════════════════════════════════ */

const VERSION = '__PRECACHE_VERSION__';
const PRECACHE = '__PRECACHE_MANIFEST__';

const CACHE = `rumman-mobile-${VERSION}`;

/** أوراق الخطوط وملفّاتها — تُخزَّن كي تبقى هويّة الحروف دون اتصال */
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll ذرّية: ملف واحد مفقود يُفشل التثبيت كلّه، وهذا المطلوب —
      // تخزين ناقص أسوأ من لا شيء، لأنه يفشل لاحقًا وعشوائيًا.
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('rumman-mobile-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET وحده قابل للتخزين، وhttp(s) وحده
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // لا نلمس الـ API ولا الملفات المرفوعة. راجع الملاحظة أعلى الملف.
  if (sameOrigin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'))) return;

  // التنقّل يُجاب من الشبكة أولًا فيظهر أي إصدار جديد فورًا، ويرجع إلى
  // الهيكل المخزَّن عند انقطاعها. الموجّه يحلّ المسار بعد إقلاع الهيكل.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          const shell = (await cache.match('/index.html')) ?? (await cache.match('/'));
          return shell ?? Response.error();
        }
      })(),
    );
    return;
  }

  const isFont = FONT_HOSTS.includes(url.origin);
  if (!sameOrigin && !isFont) return;

  // ما تبقّى — JS وCSS ببصمة المحتوى، والأيقونات، والخطوط — لا يتغيّر
  // محتواه تحت عنوانه، فالتخزين أولًا صحيح وأسرع. وما لم يُخزَّن بعد
  // يُجلب ويُحفظ، وهكذا تمتلئ حزم الشاشات المحمّلة عند الحاجة.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // الاستجابات المعتمة (status 0) لا يمكن فحصها، وتخزينها قد يحفظ
      // صفحة خطأ إلى الأبد.
      if (response.ok) cache.put(request, response.clone());
      return response;
    })(),
  );
});
