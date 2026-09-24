import { Router } from 'express';
import { z } from 'zod';
import { cartService } from './cart.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate); // السلة دائمًا لمستخدم مسجّل

const branchQuery = z.object({ branch_id: z.coerce.number().int().positive() });

const addItemBody = z.object({
  branch_id: z.coerce.number().int().positive(),
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  note: z.string().trim().max(180).optional(),
});

const updateItemBody = z.object({
  branch_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0).max(99),
});

const mergeBody = z.object({
  branch_id: z.coerce.number().int().positive(),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(99),
  })).max(100),
});

router.get('/', validate({ query: branchQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await cartService.getCart(req.user.id, q.branch_id));
}));

router.post('/items', validate({ body: addItemBody }), asyncHandler(async (req, res) => {
  const { branch_id, ...item } = req.body;
  ok(res, await cartService.addItem(req.user.id, branch_id, item), { message: 'أُضيف إلى سلتك' });
}));

router.patch('/items/:productId', validate({ body: updateItemBody }), asyncHandler(async (req, res) => {
  ok(res, await cartService.updateItem(req.user.id, req.body.branch_id, Number(req.params.productId), req.body.quantity));
}));

router.delete('/items/:productId', validate({ query: branchQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await cartService.removeItem(req.user.id, q.branch_id, Number(req.params.productId)), { message: 'حُذف من سلتك' });
}));

router.delete('/', validate({ query: branchQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await cartService.clear(req.user.id, q.branch_id), { message: 'أُفرغت السلة' });
}));

router.post('/coupon', validate({ body: z.object({ branch_id: z.coerce.number().int().positive(), code: z.string().trim().min(2).max(40) }) }),
  asyncHandler(async (req, res) => {
    ok(res, await cartService.applyCoupon(req.user.id, req.body.branch_id, req.body.code), { message: 'تم تطبيق الكود' });
  }));

router.delete('/coupon', validate({ query: branchQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await cartService.removeCoupon(req.user.id, q.branch_id));
}));

router.post('/merge', validate({ body: mergeBody }), asyncHandler(async (req, res) => {
  ok(res, await cartService.merge(req.user.id, req.body.branch_id, req.body.items), { message: 'تم دمج سلتك' });
}));

export default router;
