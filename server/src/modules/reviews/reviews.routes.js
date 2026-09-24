/**
 * التقييمات.
 * قاعدة أساسية: لا يُقيّم المنتج إلا من اشتراه فعلًا وتسلّم طلبه —
 * هذا ما يجعل تقييمات رُمّان ذات قيمة حقيقية.
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { getPagination } from '../../utils/pagination.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiters.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();

const createReviewSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(140).optional(),
  body: z.string().trim().min(5, 'اكتب كلمتين على الأقل').max(2000).optional(),
});

/** تقييمات منتج + توزيع النجوم لرسم الشريط البياني */
router.get('/product/:productId', optionalAuthenticate, asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const productId = Number(req.params.productId);

  const [countRow, distribution, reviews] = await Promise.all([
    queryOne("SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'published'", [productId]),
    query(
      `SELECT rating, COUNT(*) AS total FROM reviews
        WHERE product_id = ? AND status = 'published' GROUP BY rating ORDER BY rating DESC`,
      [productId],
    ),
    query(
      `SELECT r.id, r.rating, r.title, r.body, r.is_verified, r.helpful_count, r.created_at,
              u.full_name AS author_name, u.avatar_url AS author_avatar, u.loyalty_tier AS author_tier
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ? AND r.status = 'published'
        ORDER BY r.is_verified DESC, r.helpful_count DESC, r.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [productId],
    ),
  ]);

  // نعرض الاسم الأول والحرف الأول من العائلة حفاظًا على خصوصية العملاء
  const anonymized = reviews.map((review) => {
    const parts = String(review.author_name).split(' ');
    return { ...review, author_name: `${parts[0]} ${parts[1] ? `${parts[1][0]}.` : ''}`.trim() };
  });

  ok(res, { items: anonymized, distribution }, {
    meta: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.max(1, Math.ceil(countRow.total / limit)),
    },
  });
}));

router.use(authenticate);

/** إضافة تقييم — مع التحقّق من الشراء الموثّق */
router.post('/', writeLimiter, validate({ body: createReviewSchema }), asyncHandler(async (req, res) => {
  const { product_id, rating, title, body } = req.body;

  const purchase = await queryOne(
    `SELECT o.id FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
      ORDER BY o.delivered_at DESC LIMIT 1`,
    [req.user.id, product_id],
  );
  if (!purchase) {
    throw ApiError.forbidden('التقييم متاح لمن اشترى المنتج واستلمه', { code: 'PURCHASE_REQUIRED' });
  }

  const existing = await queryOne('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?', [product_id, req.user.id]);
  if (existing) throw ApiError.conflict('قيّمت هذا المنتج من قبل — يمكنك تعديل تقييمك');

  const result = await execute(
    `INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [product_id, req.user.id, purchase.id, rating, title ?? null, body ?? null],
  );

  created(res, await queryOne('SELECT * FROM reviews WHERE id = ?', [result.insertId]), 'شكرًا — نُشر تقييمك');
}));

/** تعديل التقييم الخاص بي */
router.patch('/:id', validate({ body: createReviewSchema.partial().omit({ product_id: true }) }), asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  if (keys.length === 0) throw ApiError.badRequest('لا توجد بيانات للتحديث');

  const result = await execute(
    `UPDATE reviews SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
    [...keys.map((k) => req.body[k]), req.params.id, req.user.id],
  );
  if (result.affectedRows === 0) throw ApiError.notFound('التقييم غير موجود');
  ok(res, null, { message: 'تم تحديث تقييمك' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await execute('DELETE FROM reviews WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw ApiError.notFound('التقييم غير موجود');
  ok(res, null, { message: 'حُذف تقييمك' });
}));

/** تصويت «مفيد» — مرة واحدة لكل عميل، والثانية تلغي التصويت */
router.post('/:id/helpful', asyncHandler(async (req, res) => {
  const reviewId = Number(req.params.id);
  const existing = await queryOne('SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id]);

  if (existing) {
    await execute('DELETE FROM review_votes WHERE id = ?', [existing.id]);
    await execute('UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = ?', [reviewId]);
    return ok(res, { voted: false });
  }

  await execute('INSERT INTO review_votes (review_id, user_id) VALUES (?, ?)', [reviewId, req.user.id]);
  await execute('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [reviewId]);
  ok(res, { voted: true });
}));

/** المنتجات التي استلمها العميل ولم يقيّمها بعد — دعوة لطيفة للتقييم */
router.get('/pending', asyncHandler(async (req, res) => {
  ok(res, await query(
    `SELECT DISTINCT p.id, p.slug, p.name_ar, p.unit_size,
            c.motif AS category_motif, c.accent_color AS category_accent,
            o.order_number, o.delivered_at
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id AND r.user_id = ?
      WHERE o.user_id = ? AND o.status = 'delivered' AND r.id IS NULL
      ORDER BY o.delivered_at DESC LIMIT 12`,
    [req.user.id, req.user.id],
  ));
}));

export default router;
