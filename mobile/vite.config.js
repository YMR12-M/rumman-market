import { X509Certificate } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { precacheManifest } from './plugins/precache-plugin.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  إعداد Vite لتطبيق الجوّال
 *
 *  المنافذ مختارة كي يعمل هذا التطبيق بجوار الواجهة المكتبية
 *  (5173 للتطوير و4173 للمعاينة) دون تصادم: 5175 للتطوير و4175
 *  للمعاينة. و`strictPort` مقصود: لو كان المنفذ مشغولًا فالأفضل أن
 *  يفشل التشغيل بصوتٍ عالٍ من أن ينتقل Vite بصمت إلى منفذٍ آخر فيفتح
 *  أحدهم الرابط القديم ويرى تطبيقًا مختلفًا.
 * ═══════════════════════════════════════════════════════════════
 */

const API_TARGET = process.env.RUMMAN_API_TARGET || 'http://localhost:4000';

/**
 * البروكسي يوجّه /api و/uploads إلى الخادم، ويحذف ترويسة Origin في الطريق.
 *
 * عبر البروكسي يكون طلب المتصفّح من الأصل نفسه فعلًا، لكنّه يرفق
 * ترويسة Origin مع كل POST وPATCH وDELETE تحمل عنوان خادم التطوير
 * لا عنوان الـ API — فترفضه قائمة CORS في الخادم لأنها لا تعرف هذا
 * المنفذ. وإضافة المنفذ إلى القائمة لا تكفي: هذا الخادم يستمع على كل
 * الواجهات ليُفتح من جوّال حقيقي، وعندها يكون الأصل هو عنوان الحاسوب
 * في الشبكة المحلّية، وهو يتغيّر. حذف الترويسة يضع الطلب على مسار
 * «طلب من الأصل نفسه» الذي هو حقيقته. هذا في التطوير وحده؛ في
 * الإنتاج راجع قسم النشر في README.
 */
const proxyToApi = {
  target: API_TARGET,
  changeOrigin: true,
  configure(proxy) {
    proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
  },
};

/**
 * HTTPS للمعاينة (`vite preview`) متى وُجدت شهادة.
 *
 * تجربة التثبيت على الشاشة الرئيسية تحتاج أصلًا آمنًا: المتصفّح يرفض
 * تسجيل عامل الخدمة عبر HTTP، و`localhost` — الاستثناء الوحيد — لا
 * يصل إليه الجوّال. التفعيل بوجود الملفّين فقط، فمن لم يولّد شهادة لا
 * يتأثّر بشيء:
 *
 *     cd mobile/.certs && mkcert -key-file key.pem -cert-file cert.pem \
 *       <عنوان-الحاسوب-في-الشبكة> localhost 127.0.0.1
 *
 * ويجب أن يثق الجوّال بالجهة التي وقّعتها (`mkcert -CAROOT`)، وهذا
 * تغيير في إعدادات أمان الجهاز فقرارُه لصاحبه. مجلّد `.certs/` مستبعد
 * من git: المفتاح الخاص لا يُشارَك، والعنوان خاصّ بجهاز وشبكة بعينهما.
 */
function localHttps() {
  const key = fileURLToPath(new URL('./.certs/key.pem', import.meta.url));
  const cert = fileURLToPath(new URL('./.certs/cert.pem', import.meta.url));
  if (!existsSync(key) || !existsSync(cert)) return undefined;

  const pem = readFileSync(cert);
  warnIfLanAddressUncovered(pem);
  return { key: readFileSync(key), cert: pem };
}

/**
 * الشهادة تسمّي عنوانًا واحدًا في الشبكة، وهو ما أعطاه الراوتر للحاسوب
 * يومها. إن تغيّر رأى الجوّال خطأ شهادة، والمتصفّح يعامل خطأ الشهادة
 * معاملة HTTP: لا عامل خدمة، و«إنشاء اختصار» مكان «تثبيت». ولا شيء
 * على الجوّال يدلّ على السبب، فنقوله هنا عند التشغيل مع الأمر الذي يصلحه.
 */
function warnIfLanAddressUncovered(pem) {
  const lanAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);

  const certificate = new X509Certificate(pem);
  const uncovered = lanAddresses.filter((address) => !certificate.checkIP(address));
  if (!uncovered.length) return;

  console.warn(
    `\n  .certs/cert.pem لا تغطّي ${uncovered.join('، ')} (صدرت لـ ${certificate.subjectAltName}).\n`
      + '  الجوّال الذي يفتح المعاينة على هذا العنوان سيرى خطأ شهادة، ولن يستطيع إلا إنشاء اختصار لا تثبيت التطبيق.\n'
      + '  أعد إصدارها للعنوان الحالي:\n\n'
      + `    cd mobile/.certs && mkcert -key-file key.pem -cert-file cert.pem ${lanAddresses.join(' ')} localhost 127.0.0.1 ::1\n`,
  );
}

export default defineConfig(({ isPreview }) => ({
  // precacheManifest يعمل عند البناء فقط؛ في التطوير يُقدَّم public/sw.js
  // كما كُتب ولا يُسجَّل أصلًا.
  plugins: [react(), precacheManifest()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5175,
    strictPort: true,
    // يستمع على كل الواجهات: غاية هذا التطبيق أن يُفتح على جوّال حقيقي
    // في الشبكة نفسها، لا في محاكي المتصفّح المكتبي وحده.
    host: true,
    proxy: { '/api': proxyToApi, '/uploads': proxyToApi },
  },

  preview: {
    port: 4175,
    strictPort: true,
    host: true,
    // undefined إن لم تُولَّد شهادة، فتبقى المعاينة على HTTP كما هي.
    // تُقرأ في المعاينة وحدها كي لا يطبع التطوير والبناء تحذير الشهادة.
    https: isPreview ? localHttps() : undefined,
    proxy: { '/api': proxyToApi, '/uploads': proxyToApi },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // تقسيم حسب الحزمة: تحديثٌ في React لا يُبطل حزمة الموجّه في
        // ذاكرة كل جوّال، والعكس صحيح.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
          return 'vendor';
        },
      },
    },
  },
}));
