/**
 * التحقّق من هوية المستخدم عبر Access Token.
 *
 * `authenticate`         → يرفض الطلب إن لم يكن هناك توكن صالح.
 * `optionalAuthenticate` → يملأ req.user إن وُجد توكن، ويكمل بهدوء إن لم يوجد
 *                          (مفيد لصفحات يمكن تصفّحها كزائر مع تخصيص للمسجّلين).
 */
import { verifyAccessToken } from '../utils/security.js';
import { queryOne } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** استخراج التوكن من ترويسة Authorization: Bearer <token> */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** تحميل المستخدم من القاعدة والتأكد من أن حسابه ما زال نشطًا */
async function loadUser(userId) {
  return queryOne(
    `SELECT id, uuid, full_name, email, phone, role, status, loyalty_points,
            loyalty_tier, wallet_balance, default_branch_id, preferred_lang
       FROM users
      WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('يلزم تسجيل الدخول للمتابعة', { code: 'NO_TOKEN' });

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw ApiError.unauthorized(
      expired ? 'انتهت صلاحية الجلسة، جدّد الدخول' : 'توكن غير صالح',
      { code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' },
    );
  }

  const user = await loadUser(payload.sub);
  if (!user) throw ApiError.unauthorized('الحساب غير موجود', { code: 'USER_NOT_FOUND' });
  if (user.status !== 'active') throw ApiError.forbidden('الحساب موقوف — تواصل مع خدمة العملاء', { code: 'USER_SUSPENDED' });

  req.user = user;
  next();
});

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await loadUser(payload.sub);
    if (user && user.status === 'active') req.user = user;
  } catch {
    // توكن تالف أو منتهٍ → نتجاهله ونكمل كزائر
  }
  next();
});
