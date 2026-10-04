import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════════
 *  ملء قائمة التخزين المسبق في عامل الخدمة
 *
 *  Vite يضيف بصمة المحتوى إلى اسم كل ملف يُخرجه، فلا يمكن معرفة
 *  قائمة ما يُخزَّن مسبقًا قبل أن توجد الحزمة. هذه الإضافة تجمعها من
 *  الحزمة وتكتبها في نسخة عامل الخدمة التي تصل إلى `dist/`، وتترك
 *  الملف الأصلي في `public/` كما هو.
 *
 *  خطّافان لا خطّاف واحد، لأنهما يعملان في لحظتين مختلفتين:
 *   • `generateBundle` حيث تُعرف أسماء الملفات الناتجة.
 *   • `closeBundle` وهي اللحظة الوحيدة المضمونة بعد نسخ `public/` إلى
 *     `dist/` — والكتابة قبلها تتسابق مع النسخ فتبقى العلامات في الإنتاج.
 * ═══════════════════════════════════════════════════════════════
 */
export function precacheManifest({
  fileName = 'sw.js',
  // ملفات public/ ليست في الحزمة، فنسمّي هنا ما يحتاجه التطبيق دون
  // اتصال. البيان والأيقونات مهمّة لأن التطبيق المثبّت يعيد قراءتها.
  extraAssets = [
    '/',
    // مذكور صراحةً: Vite يُخرج HTML من إضافة تعمل بعد هذه، فلا يظهر في
    // generateBundle. وعامل الخدمة يبحث عنه بالمسار عند انقطاع الشبكة.
    '/index.html',
    '/manifest.webmanifest',
    '/icons/favicon.svg',
    '/icons/apple-touch-icon.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
  ],
} = {}) {
  let precache = [];

  return {
    name: 'rumman:precache-manifest',
    apply: 'build',

    generateBundle(_options, bundle) {
      const emitted = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map') && name !== fileName)
        .map((name) => `/${name}`);

      // مرتّبة كي تعتمد بصمة الإصدار على محتوى البناء لا على ترتيب الإخراج
      precache = [...new Set([...extraAssets, ...emitted])].sort();
    },

    async closeBundle() {
      if (!precache.length) return;

      const outDir = resolve(this.environment?.config?.build?.outDir ?? 'dist');
      const target = resolve(outDir, fileName);

      let source;
      try {
        source = await readFile(target, 'utf8');
      } catch {
        this.error(`لم يُعثر على ${fileName} في ${outDir}. عامل الخدمة يُكتب في public/${fileName} ويُنسخ عند البناء.`);
        return;
      }

      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);

      const filled = source
        .replace("'__PRECACHE_VERSION__'", JSON.stringify(version))
        .replace("'__PRECACHE_MANIFEST__'", JSON.stringify(precache));

      // تجاهلٌ صامت هنا يشحن عاملًا يخزّن النصّ الحرفي "__PRECACHE_MANIFEST__"
      // فيفشل تثبيته على كل جهاز.
      if (filled.includes('__PRECACHE_')) {
        this.error(`بقيت علامات بلا استبدال في ${fileName}؛ محتواه لم يعد يطابق هذه الإضافة.`);
        return;
      }

      await writeFile(target, filled);
      this.info(`خُزّن مسبقًا ${precache.length} ملفًّا باسم rumman-mobile-${version}`);
    },
  };
}
