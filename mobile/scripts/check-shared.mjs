/**
 * ═══════════════════════════════════════════════════════════════
 *  التحقّق من تطابق الملفات المشتركة مع الواجهة المكتبية
 *
 *  تطبيق الجوّال واجهةٌ ثانية فوق الـ API نفسه. ما لا يتعلّق بالجهاز —
 *  عميل الـ API، والخدمات، وسياقات الجلسة والسلة والفرع، والتنسيق،
 *  وأدوات اللون، والأيقونات، والنصوص الثابتة — منسوخٌ من `client/src`
 *  نسخًا حرفيًا، لا مشتقًّا منه. لو اختلفت نسخةٌ عن أصلها صار للمتجر
 *  سلوكان: سلةٌ تُحسب بطريقة هنا وبأخرى هناك، أو تجديد جلسة يعمل في
 *  واجهة ويفشل في الأخرى.
 *
 *  لماذا نسخٌ لا حزمة مشتركة؟ لأن استخراجها إلى مساحة عمل رابعة يعني
 *  إعادة كتابة كل استيراد في الواجهة المكتبية — تعديلٌ على كود يعمل لا
 *  تحتاجه هذه الميزة. هذا الفحص هو الثمن: يعمل قبل كل بناء، ويفشل
 *  بصوتٍ عالٍ إن انحرفت نسخة، ويقول أيّها.
 * ═══════════════════════════════════════════════════════════════
 */
import { readFile } from 'node:fs/promises';

export const SHARED_FILES = [
  'lib/api.js',
  'lib/storage.js',
  'lib/format.js',
  'lib/color.js',
  'lib/icons.jsx',
  'lib/motifs.jsx',
  'lib/art.jsx',
  'lib/art-items.jsx',
  'services/index.js',
  'services/catalog.service.js',
  'services/admin.service.js',
  'context/AuthContext.jsx',
  'context/BranchContext.jsx',
  'context/CartContext.jsx',
  'context/WishlistContext.jsx',
  'context/SiteContext.jsx',
  'context/ThemeContext.jsx',
  'hooks/index.js',
  'data/content.js',
  // توكنات الهوية حرفيًا: لقطة شاشة من أيّ الواجهتين يجب أن تُقرأ منتجًا واحدًا.
  // ما يخصّ الجوّال وحده يعيش في styles/tokens-phone.css.
  'styles/tokens.css',
  // لغة المطبوعات (ظلال صلبة، أختام، مظلّة، إيصال، ستيكرات): واحدة للواجهتين.
  'styles/print.css',
];

const clientRoot = new URL('../../client/src/', import.meta.url);
const mobileRoot = new URL('../src/', import.meta.url);

const problems = [];

for (const relative of SHARED_FILES) {
  let original;
  let copy;
  try {
    original = await readFile(new URL(relative, clientRoot));
  } catch {
    problems.push(`${relative}: الأصل غير موجود في client/src — هل نُقل أو حُذف؟`);
    continue;
  }
  try {
    copy = await readFile(new URL(relative, mobileRoot));
  } catch {
    problems.push(`${relative}: النسخة غير موجودة في mobile/src`);
    continue;
  }
  if (!original.equals(copy)) problems.push(`${relative}: النسخة تختلف عن الأصل`);
}

if (problems.length > 0) {
  console.error('\n✖ الملفات المشتركة بين الواجهتين لم تعد متطابقة:\n');
  for (const line of problems) console.error(`   • ${line}`);
  console.error(
    '\n  عدّل الأصل في client/src ثم انسخه كما هو إلى mobile/src (أو العكس)،'
    + '\n  فالملفّان يجب أن يبقيا متطابقين حرفيًا. التفاصيل في mobile/README.md.\n',
  );
  process.exit(1);
}

console.log(`✓ الملفات المشتركة (${SHARED_FILES.length}) مطابقة للواجهة المكتبية.`);
