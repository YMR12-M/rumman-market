/**
 * التحكّم في الصلاحيات بعد التحقّق من الهوية.
 *
 *   authorize(ROLES.ADMIN)                  → للمدير فقط
 *   authorize(ROLES.STAFF, ROLES.ADMIN)     → لأي من الدورين
 *   atLeast(ROLES.BRANCH_MANAGER)           → لهذا الدور وما فوقه
 */
import { ApiError } from '../utils/ApiError.js';
import { ROLE_RANK } from '../config/constants.js';

export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('هذا القسم مخصّص لفريق رُمّان'));
  }
  next();
};

export const atLeast = (minimumRole) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if ((ROLE_RANK[req.user.role] || 0) < (ROLE_RANK[minimumRole] || 99)) {
    return next(ApiError.forbidden('صلاحيتك لا تكفي لهذا الإجراء'));
  }
  next();
};
