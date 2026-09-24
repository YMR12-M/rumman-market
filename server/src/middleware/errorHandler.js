/**
 * معالج الأخطاء المركزي — آخر middleware في السلسلة.
 *
 * المبدأ: أي خطأ من نوع ApiError يُعرض كما هو للعميل (رسائل عربية مفهومة)،
 * وأي خطأ آخر يُسجَّل بالكامل في السيرفر ويُعرض للعميل برسالة عامة
 * حتى لا نسرّب تفاصيل داخلية أو أسماء جداول.
 */
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/** ترجمة أخطاء MySQL الشائعة إلى رسائل مفهومة */
function translateDbError(error) {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return ApiError.conflict('هذه البيانات مسجّلة بالفعل', { code: 'DUPLICATE' });
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_NO_REFERENCED_ROW':
      return ApiError.badRequest('عنصر مرتبط غير موجود', { code: 'FK_MISSING' });
    case 'ER_ROW_IS_REFERENCED_2':
      return ApiError.conflict('لا يمكن الحذف — العنصر مستخدم في سجلات أخرى', { code: 'FK_IN_USE' });
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
      return ApiError.internal('قاعدة البيانات غير متاحة حاليًا', { code: 'DB_DOWN' });
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars -- توقيع Express يتطلّب أربعة معاملات
export function errorHandler(error, req, res, _next) {
  let apiError = error instanceof ApiError ? error : translateDbError(error);

  if (!apiError) {
    logger.error(`${req.method} ${req.originalUrl} — ${error.message}`);
    if (!env.isProd) console.error(error.stack);
    apiError = ApiError.internal();
  }

  if (apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${apiError.message}`);
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    code: apiError.code,
    ...(apiError.details ? { errors: apiError.details } : {}),
    ...(env.isProd ? {} : { path: req.originalUrl }),
  });
}
