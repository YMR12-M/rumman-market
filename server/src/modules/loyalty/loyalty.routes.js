/** برنامج الولاء: الرصيد، الفئات، وكشف حركة النقاط */
import { Router } from 'express';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { LOYALTY_TIERS } from '../../config/constants.js';
import { env } from '../../config/env.js';

const router = Router();

/** شرح البرنامج — صفحة عامة لا تحتاج تسجيل دخول */
router.get('/tiers', asyncHandler(async (_req, res) => {
  ok(res, {
    tiers: LOYALTY_TIERS,
    point_value_egp: env.business.pointValueEgp,
    points_per_egp: env.business.pointsPerEgp,
    max_redemption_percent: 50,
  });
}));

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const [transactions, stats] = await Promise.all([
    query(
      `SELECT lt.type, lt.points, lt.balance_after, lt.note, lt.created_at, o.order_number
         FROM loyalty_transactions lt
         LEFT JOIN orders o ON o.id = lt.order_id
        WHERE lt.user_id = ? ORDER BY lt.created_at DESC LIMIT 60`,
      [req.user.id],
    ),
    queryOne(
      `SELECT COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS total_earned,
              COALESCE(SUM(CASE WHEN points < 0 THEN -points ELSE 0 END), 0) AS total_redeemed
         FROM loyalty_transactions WHERE user_id = ?`,
      [req.user.id],
    ),
  ]);

  const tierIndex = LOYALTY_TIERS.findIndex((t) => t.key === req.user.loyalty_tier);

  ok(res, {
    balance: req.user.loyalty_points,
    value_egp: +(req.user.loyalty_points * env.business.pointValueEgp).toFixed(2),
    tier: LOYALTY_TIERS[tierIndex],
    next_tier: LOYALTY_TIERS[tierIndex + 1] ?? null,
    stats,
    transactions,
  });
}));

export default router;
