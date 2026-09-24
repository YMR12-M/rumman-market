/**
 * دفتر عناوين العميل.
 * قاعدة: عنوان افتراضي واحد فقط — نضمنها بتصفير البقية عند التعيين.
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();
router.use(authenticate);

const addressSchema = z.object({
  label: z.string().trim().max(40).default('المنزل'),
  recipient_name: z.string().trim().min(3, 'اسم المستلم مطلوب').max(120),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, 'رقم هاتف مصري غير صحيح'),
  governorate: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().max(120).optional(),
  street: z.string().trim().min(3, 'اسم الشارع مطلوب').max(180),
  building: z.string().trim().max(40).optional(),
  floor: z.string().trim().max(20).optional(),
  apartment: z.string().trim().max(20).optional(),
  landmark: z.string().trim().max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  is_default: z.coerce.boolean().default(false),
});

const FIELDS = ['label','recipient_name','phone','governorate','city','area','street','building','floor','apartment','landmark','latitude','longitude'];

router.get('/', asyncHandler(async (req, res) => {
  ok(res, await query(
    'SELECT * FROM addresses WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC',
    [req.user.id],
  ));
}));

router.post('/', validate({ body: addressSchema }), asyncHandler(async (req, res) => {
  const body = req.body;
  const address = await transaction(async (cx) => {
    // أول عنوان يصبح افتراضيًا تلقائيًا
    const [[countRow]] = await cx.execute('SELECT COUNT(*) AS total FROM addresses WHERE user_id = ? AND deleted_at IS NULL', [req.user.id]);
    const makeDefault = body.is_default || countRow.total === 0;

    if (makeDefault) await cx.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);

    const [result] = await cx.execute(
      `INSERT INTO addresses (user_id, ${FIELDS.join(', ')}, is_default)
       VALUES (?, ${FIELDS.map(() => '?').join(', ')}, ?)`,
      [req.user.id, ...FIELDS.map((f) => body[f] ?? null), makeDefault ? 1 : 0],
    );
    const [[row]] = await cx.execute('SELECT * FROM addresses WHERE id = ?', [result.insertId]);
    return row;
  });

  created(res, address, 'أُضيف العنوان');
}));

router.patch('/:id', validate({ body: addressSchema.partial() }), asyncHandler(async (req, res) => {
  const owned = await queryOne('SELECT id FROM addresses WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
  if (!owned) throw ApiError.notFound('العنوان غير موجود');

  const keys = Object.keys(req.body).filter((k) => [...FIELDS, 'is_default'].includes(k));
  if (keys.length === 0) throw ApiError.badRequest('لا توجد بيانات للتحديث');

  await transaction(async (cx) => {
    if (req.body.is_default) await cx.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    await cx.execute(
      `UPDATE addresses SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
      [...keys.map((k) => req.body[k]), req.params.id, req.user.id],
    );
  });

  ok(res, await queryOne('SELECT * FROM addresses WHERE id = ?', [req.params.id]), { message: 'تم تحديث العنوان' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  // حذف منطقي حتى لا تفقد الطلبات القديمة عنوانها
  const result = await execute('UPDATE addresses SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw ApiError.notFound('العنوان غير موجود');
  ok(res, null, { message: 'حُذف العنوان' });
}));

export default router;
