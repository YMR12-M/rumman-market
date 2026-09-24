import { Router } from 'express';
import { z } from 'zod';
import { couponsService } from './coupons.service.js';
import { cartService } from '../cart/cart.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

/** الكوبونات المعروضة للجميع في صفحة العروض */
router.get('/', asyncHandler(async (_req, res) => ok(res, await couponsService.listActive())));

/** معاينة أثر كوبون على السلة الحالية قبل تأكيد الطلب */
router.post(
  '/validate',
  authenticate,
  validate({ body: z.object({ code: z.string().trim().min(2).max(40), branch_id: z.coerce.number().int().positive() }) }),
  asyncHandler(async (req, res) => {
    const result = await cartService.applyCoupon(req.user.id, req.body.branch_id, req.body.code);
    ok(res, result, { message: 'تم تطبيق الكود' });
  }),
);

export default router;
