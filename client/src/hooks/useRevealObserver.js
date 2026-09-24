import { useEffect } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 *  مراقب الكشف العام
 *
 *  المشكلة التي يحلّها: كل بطاقة أو قسم يحمل الفئة `.reveal` يبدأ
 *  شفافًا، ولو لم يُراقَب لبقي مخفيًا للأبد. بدل ربط ref بكل عنصر
 *  (وهو ما يُنسى بسهولة)، نركّب مراقبًا واحدًا في جذر التطبيق:
 *
 *   • IntersectionObserver يكشف العناصر عند دخولها الشاشة.
 *   • MutationObserver يلتقط العناصر الجديدة بعد كل تنقّل أو تحميل بيانات.
 *   • شبكة أمان زمنية تُظهر أي عنصر بقي مخفيًا — فلا يختفي محتوى أبدًا
 *     بسبب خلل في المراقبة أو متصفّح لا يدعمها.
 *   • من يفضّل تقليل الحركة يرى كل شيء فورًا بلا أي تأثير.
 * ═══════════════════════════════════════════════════════════════
 */
export function useRevealObserver() {
  useEffect(() => {
    const revealAll = () => {
      document.querySelectorAll('.reveal:not(.is-visible)')
        .forEach((node) => node.classList.add('is-visible'));
    };

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      revealAll();
      const mutation = new MutationObserver(revealAll);
      mutation.observe(document.body, { childList: true, subtree: true });
      return () => mutation.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -30px' },
    );

    /** ضمّ كل العناصر غير المكشوفة إلى المراقبة */
    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((node) => observer.observe(node));
    };

    scan();

    // العناصر تصل متأخّرة (تحميل البيانات، تغيير المسار) — نعيد المسح
    const mutation = new MutationObserver(scan);
    mutation.observe(document.body, { childList: true, subtree: true });

    // شبكة أمان: لا نترك محتوى مخفيًا مهما حدث
    const safety = setInterval(revealAll, 1800);

    return () => {
      observer.disconnect();
      mutation.disconnect();
      clearInterval(safety);
    };
  }, []);
}
