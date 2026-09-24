/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة التحكّم — تحليلات للإدارة
 *  كل المسارات هنا تتطلّب صلاحية مدير فرع فما فوق.
 * ═══════════════════════════════════════════════════════════════
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { atLeast } from '../../middleware/authorize.js';
import { ROLES } from '../../config/constants.js';

const router = Router();
router.use(authenticate, atLeast(ROLES.BRANCH_MANAGER));

const rangeQuery = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/** مؤشّرات الأداء الرئيسية مقارنةً بالفترة السابقة المماثلة */
router.get('/overview', validate({ query: rangeQuery }), asyncHandler(async (req, res) => {
  const { branch_id: branchId, days } = req.validatedQuery || { days: 30 };
  const branchFilter = branchId ? 'AND o.branch_id = ?' : '';
  const params = (extra = []) => (branchId ? [...extra, branchId] : extra);

  const [current, previous, topProducts, byCategory, dailyTrend, lowStock, statusBreakdown] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.grand_total),0) AS revenue,
              COALESCE(AVG(o.grand_total),0) AS avg_order_value,
              COUNT(DISTINCT o.user_id) AS customers
         FROM orders o
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.status NOT IN ('cancelled','refunded') ${branchFilter}`,
      params([days]),
    ),
    queryOne(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.grand_total),0) AS revenue
         FROM orders o
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.placed_at <  DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.status NOT IN ('cancelled','refunded') ${branchFilter}`,
      params([days * 2, days]),
    ),
    query(
      `SELECT p.name_ar, p.slug, c.name_ar AS category_name,
              SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         JOIN categories c ON c.id = p.category_id
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.status NOT IN ('cancelled','refunded') ${branchFilter}
        GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
      params([days]),
    ),
    query(
      `SELECT c.name_ar AS category, c.accent_color AS color,
              SUM(oi.line_total) AS revenue, SUM(oi.quantity) AS units
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         JOIN categories c ON c.id = p.category_id
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.status NOT IN ('cancelled','refunded') ${branchFilter}
        GROUP BY c.id ORDER BY revenue DESC`,
      params([days]),
    ),
    query(
      `SELECT DATE(o.placed_at) AS day, COUNT(*) AS orders, COALESCE(SUM(o.grand_total),0) AS revenue
         FROM orders o
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND o.status NOT IN ('cancelled','refunded') ${branchFilter}
        GROUP BY DATE(o.placed_at) ORDER BY day ASC`,
      params([days]),
    ),
    query(
      `SELECT p.name_ar, p.sku, b.name_ar AS branch_name,
              (i.quantity - i.reserved) AS available, i.low_stock_threshold
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         JOIN branches b ON b.id = i.branch_id
        WHERE (i.quantity - i.reserved) <= i.low_stock_threshold
          ${branchId ? 'AND i.branch_id = ?' : ''}
        ORDER BY available ASC LIMIT 20`,
      branchId ? [branchId] : [],
    ),
    query(
      `SELECT o.status, COUNT(*) AS total FROM orders o
        WHERE o.placed_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ${branchFilter}
        GROUP BY o.status`,
      params([days]),
    ),
  ]);

  /** نسبة النمو مقارنةً بالفترة السابقة */
  const growth = (now, before) => (Number(before) > 0 ? +(((Number(now) - Number(before)) / Number(before)) * 100).toFixed(1) : null);

  ok(res, {
    range_days: days,
    kpis: {
      revenue: Number(current.revenue),
      revenue_growth: growth(current.revenue, previous.revenue),
      orders: current.orders,
      orders_growth: growth(current.orders, previous.orders),
      avg_order_value: +Number(current.avg_order_value).toFixed(2),
      customers: current.customers,
    },
    daily_trend: dailyTrend,
    top_products: topProducts,
    by_category: byCategory,
    status_breakdown: statusBreakdown,
    low_stock: lowStock,
  });
}));

/** مقارنة أداء الفروع — للمدير العام */
router.get('/branches', asyncHandler(async (_req, res) => {
  ok(res, await query(
    `SELECT b.id, b.name_ar, b.city,
            COUNT(o.id) AS orders,
            COALESCE(SUM(o.grand_total),0) AS revenue,
            COALESCE(AVG(o.grand_total),0) AS avg_order_value,
            COALESCE(AVG(o.rating),0) AS avg_rating
       FROM branches b
       LEFT JOIN orders o ON o.branch_id = b.id
                         AND o.placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                         AND o.status NOT IN ('cancelled','refunded')
      WHERE b.deleted_at IS NULL
      GROUP BY b.id ORDER BY revenue DESC`,
  ));
}));

/** طابور التجهيز — الطلبات النشطة في الفرع مرتّبة بالأقدم */
router.get('/queue', validate({ query: z.object({ branch_id: z.coerce.number().int().positive() }) }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await query(
    `SELECT o.order_number, o.status, o.fulfillment_type, o.grand_total, o.placed_at,
            o.slot_from, o.slot_to, u.full_name AS customer_name, u.phone AS customer_phone,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
            TIMESTAMPDIFF(MINUTE, o.placed_at, NOW()) AS minutes_waiting
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.branch_id = ? AND o.status IN ('pending','confirmed','preparing','ready','out_for_delivery')
      ORDER BY o.placed_at ASC`,
    [q.branch_id],
  ));
}));

export default router;
