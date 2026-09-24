/**
 * شكل موحّد لكل استجابات الـ API.
 * الواجهة تعتمد على وجود `success` و`data` دائمًا، فلا تتفاجأ بأشكال مختلفة.
 */

/** استجابة ناجحة */
export const ok = (res, data = null, { message = null, meta = null, status = 200 } = {}) =>
  res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });

/** استجابة إنشاء عنصر جديد */
export const created = (res, data, message = 'تم الإنشاء بنجاح') =>
  ok(res, data, { message, status: 201 });

/** استجابة قائمة مرقّمة مع بيانات الترقيم */
export const paginated = (res, items, { page, limit, total }) =>
  ok(res, items, {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
