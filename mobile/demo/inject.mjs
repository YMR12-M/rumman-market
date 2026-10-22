/* ============================================
   خطوة بعد البناء لنسخة الجوّال التجريبية (عرض فقط):
   بتستخدم نفس الباك إند التجريبي بتاع الواجهة المكتبية (client/demo/demo-api.js)
   لأن الجوّال بيكلّم نفس الـ API بنفس الخدمات. بتنسخه جوه dist وبتحط وسم
   السكريبت في أول <head>، ومعاه CSS بيرفع كبسولة «نسخة تجريبية» فوق شريط
   التابات عشان ماتغطّيهوش.

   التشغيل:  node demo/inject.mjs [مجلد-dist]      (الافتراضي ../dist)
   ============================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] || path.join(here, '..', 'dist'));
const indexPath = path.join(dist, 'index.html');
const demoApi = path.join(here, '..', '..', 'client', 'demo', 'demo-api.js');

if (!fs.existsSync(indexPath)) {
  console.error(`❌ مفيش ${indexPath} - شغّل بناء الواجهة الأول.`);
  process.exit(1);
}

fs.copyFileSync(demoApi, path.join(dist, 'demo-api.js'));

const html = fs.readFileSync(indexPath, 'utf8');
if (html.includes('/demo-api.js')) {
  console.log('✓ السكريبت متحط قبل كده.');
  process.exit(0);
}
const head = /<head[^>]*>/i;
if (!head.test(html)) {
  console.error('❌ مش لاقي وسم <head> في index.html.');
  process.exit(1);
}
const lift = '<style>#demo-bar{bottom:calc(var(--tabbar-space,62px) + 10px)!important;z-index:250!important}</style>';
// من غير defer ولا type=module عمدًا: لازم يشتغل قبل سكريبتات التطبيق (module = مؤجّل)
fs.writeFileSync(
  indexPath,
  html.replace(head, (tag) => `${tag}\n    <script src="/demo-api.js"></script>\n    ${lift}`),
);
console.log(`✅ نسخة الجوّال التجريبية جاهزة في ${dist}`);
