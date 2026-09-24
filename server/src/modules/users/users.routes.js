/**
 * ملف المستخدم: البيانات الشخصية، التفضيلات، والملخّص المالي.
 * كل المسارات هنا تخصّ المستخدم الحالي فقط — لا يمكن قراءة حساب آخر.
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { LOYALTY_TIERS } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();
router.use(authenticate);

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(3).max(120).optional(),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, 'رقم هاتف مصري غير صحيح').optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['male', 'female', 'unspecified']).optional(),
  preferred_lang: z.enum(['ar', 'en']).optional(),
  default_branch_id: z.coerce.number().int().positive().optional().nullable(),
  avatar_url: z.string().url().max(255).optional().nullable(),
});

/** الملف الشخصي مع تقدّم فئة الولاء */
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT id, uuid, full_name, email, phone, role, avatar_url, birth_date, gender,
            preferred_lang, default_branch_id, loyalty_points, loyalty_tier,
            wallet_balance, total_spent, orders_count, created_at
       FROM users WHERE id = ?`,
    [req.user.id],
  );

  const currentIndex = LOYALTY_TIERS.findIndex((t) => t.key === user.loyalty_tier);
  const nextTier = LOYALTY_TIERS[currentIndex + 1] ?? null;

  ok(res, {
    ...user,
    tier: LOYALTY_TIERS[currentIndex],
    next_tier: nextTier,
    // كم يتبقّى من الإنفاق للوصول للفئة التالية
    spend_to_next_tier: nextTier ? Math.max(0, nextTier.minSpent - Number(user.total_spent)) : 0,
  });
}));

router.patch('/profile', validate({ body: updateProfileSchema }), asyncHandler(async (req, res) => {
  const fields = Object.keys(req.body);
  if (fields.length === 0) throw ApiError.badRequest('لا توجد بيانات للتحديث');

  // بناء جملة SET ديناميكيًا من قائمة حقول معروفة مسبقًا (لا من مدخلات حرّة)
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const values = fields.map((field) => req.body[field]);

  await execute(`UPDATE users SET ${assignments} WHERE id = ?`, [...values, req.user.id]);
  ok(res, null, { message: 'تم تحديث بياناتك' });
}));

/** لوحة الحساب: أرقام سريعة يحتاجها العميل في نظرة واحدة */
router.get('/summary', asyncHandler(async (req, res) => {
  const [orders, wishlist, notifications, lastOrder] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) AS total,
              SUM(status = 'delivered') AS delivered,
              SUM(status IN ('pending','confirmed','preparing','ready','out_for_delivery')) AS active
         FROM orders WHERE user_id = ?`,
      [req.user.id],
    ),
    queryOne('SELECT COUNT(*) AS total FROM wishlists WHERE user_id = ?', [req.user.id]),
    queryOne('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]),
    queryOne(
      `SELECT o.order_number, o.status, o.grand_total, o.placed_at, b.name_ar AS branch_name
         FROM orders o JOIN branches b ON b.id = o.branch_id
        WHERE o.user_id = ? ORDER BY o.placed_at DESC LIMIT 1`,
      [req.user.id],
    ),
  ]);

  ok(res, {
    orders: {
      total: orders.total ?? 0,
      delivered: Number(orders.delivered ?? 0),
      active: Number(orders.active ?? 0),
    },
    wishlist_count: wishlist.total,
    unread_notifications: notifications.unread,
    last_order: lastOrder,
    loyalty_points: req.user.loyalty_points,
    wallet_balance: req.user.wallet_balance,
  });
}));

/** كشف حساب المحفظة */
router.get('/wallet', asyncHandler(async (req, res) => {
  const transactions = await query(
    'SELECT type, amount, balance_after, reason, reference, created_at FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id],
  );
  ok(res, { balance: req.user.wallet_balance, transactions });
}));

export default router;
