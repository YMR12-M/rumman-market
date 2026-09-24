/**
 * ═══════════════════════════════════════════════════════════════
 *  رفع الملفات — صور المنتجات وإيصالات التحويل
 *
 *  الملفات المرفوعة من المستخدمين هي أخطر مدخل في أي تطبيق ويب،
 *  فالدفاع هنا على أربع طبقات:
 *
 *   ١) اسم الملف يُولَّد عندنا بالكامل (UUID + امتداد من قائمة بيضاء).
 *      لا نستخدم اسم المستخدم إطلاقًا — فينتفي مسار `../../` وما شابه.
 *   ٢) النوع يُفحَص من **محتوى** الملف (البايتات الأولى) لا من ترويسة
 *      `Content-Type` التي يتحكّم بها المرسِل.
 *   ٣) الحجم محدود قبل القراءة، فلا يُستهلك القرص برفع ضخم.
 *   ٤) مجلّد الرفع يُقدَّم بترويسات تمنع تنفيذ أي شيء فيه.
 * ═══════════════════════════════════════════════════════════════
 */
import multer from 'multer';
import crypto from 'node:crypto';
import { open, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = join(__dirname, '../../uploads');

/** المجلّدات المسموح الرفع إليها — لا شيء خارج هذه القائمة */
export const BUCKETS = {
  products: 'products',
  proofs: 'proofs',
  branches: 'branches',
};

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/**
 * توقيعات الملفات (magic bytes).
 * نقرأ أول 12 بايت ونطابقها — فلا يمرّ ملفّ PHP سُمّي `.jpg`.
 */
const SIGNATURES = [
  { mime: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  // WEBP: "RIFF" ثم 4 بايت حجم ثم "WEBP"
  { mime: 'image/webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
];

async function sniffMime(filePath) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);

    const matches = (signature) =>
      signature.bytes.every((byte, index) => buffer[signature.offset + index] === byte);

    if (SIGNATURES.filter((s) => s.mime === 'image/webp').every(matches)) return 'image/webp';
    const hit = SIGNATURES.find((s) => s.mime !== 'image/webp' && matches(s));
    return hit?.mime ?? null;
  } finally {
    await handle.close();
  }
}

/** يهيّئ مجلّدات الرفع عند الإقلاع */
export async function ensureUploadDirs() {
  for (const bucket of Object.values(BUCKETS)) {
    await mkdir(join(UPLOAD_ROOT, bucket), { recursive: true });
  }
}

function storageFor(bucket) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, join(UPLOAD_ROOT, bucket)),
    filename: (_req, file, callback) => {
      // الامتداد من نوع الملف المُعلَن فقط — والمحتوى يُفحَص بعد الكتابة
      const extension = EXTENSIONS[file.mimetype] || extname(file.originalname).toLowerCase().slice(0, 5);
      callback(null, `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${extension}`);
    },
  });
}

/**
 * وسيط رفع صورة واحدة.
 * @param {string} bucket أحد BUCKETS
 * @param {string} field اسم الحقل في النموذج
 */
export function uploadImage(bucket, field = 'image') {
  const handler = multer({
    storage: storageFor(bucket),
    limits: {
      fileSize: env.uploads.maxFileMb * 1024 * 1024,
      files: 1,
      fields: 20,
    },
    fileFilter: (_req, file, callback) => {
      if (!EXTENSIONS[file.mimetype]) {
        return callback(ApiError.badRequest('الصيغ المقبولة: JPG · PNG · WEBP فقط', { code: 'BAD_FILE_TYPE' }));
      }
      return callback(null, true);
    },
  }).single(field);

  return (req, res, next) => {
    handler(req, res, async (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.payloadTooLarge(
            `أقصى حجم للملف ${env.uploads.maxFileMb} ميجابايت`, { code: 'FILE_TOO_LARGE' },
          ));
        }
        return next(error instanceof ApiError ? error : ApiError.badRequest(error.message));
      }

      if (!req.file) return next();

      // الطبقة الحاسمة: فحص المحتوى الفعلي بعد الكتابة على القرص
      try {
        const actual = await sniffMime(req.file.path);
        if (!actual || actual !== req.file.mimetype) {
          await unlink(req.file.path).catch(() => {});
          return next(ApiError.badRequest('محتوى الملف لا يطابق صيغته — ارفع صورة صحيحة', { code: 'BAD_FILE_CONTENT' }));
        }
      } catch {
        await unlink(req.file.path).catch(() => {});
        return next(ApiError.badRequest('تعذّر قراءة الملف المرفوع'));
      }

      // العنوان العام الذي يُخزَّن في القاعدة ويُعرض للعميل
      req.file.publicUrl = `${env.uploads.publicUrl || ''}/uploads/${bucket}/${req.file.filename}`;
      return next();
    });
  };
}
