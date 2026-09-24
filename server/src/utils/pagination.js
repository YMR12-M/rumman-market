import { PAGINATION } from '../config/constants.js';

/**
 * قراءة معاملات الترقيم من الـ query مع فرض حدود آمنة.
 * نعيد أيضًا `offset` الجاهز للاستخدام في LIMIT/OFFSET.
 */
export function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.limit, 10) || PAGINATION.defaultLimit;
  const limit = Math.min(Math.max(1, requested), PAGINATION.maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}
