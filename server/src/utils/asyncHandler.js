/**
 * يغلّف معالجات المسارات غير المتزامنة حتى يُمرَّر أي رفض (rejection)
 * تلقائيًا إلى معالج الأخطاء المركزي بدل أن يسقط الطلب صامتًا.
 *
 * @example router.get('/', asyncHandler(controller.list))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
