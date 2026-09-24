/** قائمة الأمنيات — إضافة/حذف/تبديل وعرض بأسعار الفرع الحالي */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: z.object({ branch_id: z.coerce.number().int().positive().optional() }) }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const params = [];
  const join = q.branch_id ? 'LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?' : 'LEFT JOIN inventory i ON 1 = 0';
  if (q.branch_id) params.push(q.branch_id);
  params.push(req.user.id);

  ok(res, await query(
    `SELECT p.id, p.slug, p.name_ar, p.short_desc_ar, p.unit, p.unit_size,
            p.compare_at_price, p.rating_avg, p.rating_count, p.badge,
            COALESCE(i.price_override, p.price) AS effective_price,
            GREATEST(COALESCE(i.quantity,0) - COALESCE(i.reserved,0), 0) AS stock,
            c.slug AS category_slug, c.name_ar AS category_name,
            c.motif AS category_motif, c.accent_color AS category_accent,
            w.created_at AS added_at
       FROM wishlists w
       JOIN products p ON p.id = w.product_id AND p.status = 'active'
       JOIN categories c ON c.id = p.category_id
       ${join}
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC`,
    params,
  ));
}));

/** تبديل الحالة: موجود ⇄ غير موجود — أنسب لزر القلب في الواجهة */
router.post('/toggle', validate({ body: z.object({ product_id: z.coerce.number().int().positive() }) }), asyncHandler(async (req, res) => {
  const { product_id } = req.body;
  const existing = await queryOne('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);

  if (existing) {
    await execute('DELETE FROM wishlists WHERE id = ?', [existing.id]);
    return ok(res, { in_wishlist: false }, { message: 'أُزيل من المفضّلة' });
  }

  await execute('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
  ok(res, { in_wishlist: true }, { message: 'أُضيف إلى المفضّلة' });
}));

/** معرّفات المفضّلة فقط — تستخدمها الواجهة لتلوين القلوب دفعة واحدة */
router.get('/ids', asyncHandler(async (req, res) => {
  const rows = await query('SELECT product_id FROM wishlists WHERE user_id = ?', [req.user.id]);
  ok(res, rows.map((row) => row.product_id));
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  await execute('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
  ok(res, null, { message: 'أُزيل من المفضّلة' });
}));

export default router;
