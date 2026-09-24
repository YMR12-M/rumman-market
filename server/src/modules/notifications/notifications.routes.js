/** الإشعارات داخل التطبيق (طلبات، عروض، ولاء) */
import { Router } from 'express';
import { query, queryOne, execute } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { getPagination } from '../../utils/pagination.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { limit, offset } = getPagination(req.query);
  const [items, unread] = await Promise.all([
    query(
      `SELECT id, type, title, body, link, read_at, created_at
         FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [req.user.id],
    ),
    queryOne('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]),
  ]);
  ok(res, { items, unread_count: unread.total });
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  await execute('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL', [req.params.id, req.user.id]);
  ok(res, null);
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await execute('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  ok(res, null, { message: 'تم تعليم الكل كمقروء' });
}));

export default router;
