import { ApiError } from '../utils/ApiError.js';

/** يُلتقط أي مسار غير معرّف ويحوّله لخطأ 404 موحّد الشكل */
export const notFound = (req, _res, next) =>
  next(ApiError.notFound(`المسار غير موجود: ${req.method} ${req.originalUrl}`, { code: 'ROUTE_NOT_FOUND' }));
