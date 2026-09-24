/**
 * التحقّق من صحّة المدخلات باستخدام Zod.
 *
 * نمرّر مخططًا لكل مصدر (body / query / params)، وعند الفشل نُرجع 422
 * مع قائمة أخطاء مفصّلة بالحقول ليعرضها الفورم مباشرة أمام كل حقل.
 *
 * @example
 *   router.post('/', validate({ body: registerSchema }), controller.register)
 */
import { ApiError } from '../utils/ApiError.js';

export const validate = (schemas) => (req, _res, next) => {
  const fieldErrors = {};

  for (const source of ['body', 'query', 'params']) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);
    if (result.success) {
      // نستبدل المدخلات بالنسخة المُنظّفة (تحويل الأنواع، إزالة الحقول الزائدة)
      if (source === 'query') {
        // req.query getter فقط في Express 5، فنخزّن النتيجة في مكان آمن
        req.validatedQuery = result.data;
      } else {
        req[source] = result.data;
      }
      continue;
    }

    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || source;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return next(ApiError.unprocessable('تحقّق من البيانات المُدخلة', {
      code: 'VALIDATION_ERROR',
      details: fieldErrors,
    }));
  }

  next();
};
