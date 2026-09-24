import { Router } from 'express';
import { ordersService } from './orders.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/response.js';
import { getPagination } from '../../utils/pagination.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { atLeast } from '../../middleware/authorize.js';
import { writeLimiter } from '../../middleware/rateLimiters.js';
import { ROLES } from '../../config/constants.js';
import * as schema from './orders.validation.js';

const router = Router();

/** مواعيد التوصيل متاحة للتصفّح قبل تسجيل الدخول */
router.get('/slots', validate({ query: schema.slotsQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await ordersService.availableSlots(q.branch_id, q.date));
}));

router.use(authenticate);

router.post('/', writeLimiter, validate({ body: schema.createOrderSchema }), asyncHandler(async (req, res) => {
  const order = await ordersService.create(req.user.id, req.body);
  created(res, order, `تم تأكيد طلبك ${order.order_number}`);
}));

router.get('/', validate({ query: schema.listOrdersQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const pagination = getPagination(q);
  const { items, pagination: meta } = await ordersService.listForUser(req.user.id, { status: q.status, ...pagination });
  paginated(res, items, meta);
}));

router.get('/:orderNumber', asyncHandler(async (req, res) => {
  // الفريق يرى أي طلب؛ العميل يرى طلبه فقط
  const scopeUser = req.user.role === ROLES.CUSTOMER ? req.user.id : null;
  ok(res, await ordersService.findByNumber(req.params.orderNumber, scopeUser));
}));

router.post('/:orderNumber/cancel', validate({ body: schema.cancelSchema }), asyncHandler(async (req, res) => {
  ok(res, await ordersService.cancelByCustomer(req.params.orderNumber, req.user.id, req.body.reason), { message: 'تم إلغاء الطلب' });
}));

router.post('/:orderNumber/reorder', writeLimiter, asyncHandler(async (req, res) => {
  const result = await ordersService.reorder(req.params.orderNumber, req.user.id);
  ok(res, result, {
    message: result.skipped.length
      ? `أُضيفت الأصناف المتاحة. تعذّر إضافة: ${result.skipped.join('، ')}`
      : 'أُضيفت كل أصناف الطلب إلى سلتك',
  });
}));

router.post('/:orderNumber/rate', validate({ body: schema.rateSchema }), asyncHandler(async (req, res) => {
  ok(res, await ordersService.rate(req.params.orderNumber, req.user.id, req.body.rating), { message: 'شكرًا لتقييمك' });
}));

/** تغيير الحالة — لفريق الفرع فما فوق */
router.patch('/:orderNumber/status', atLeast(ROLES.STAFF), validate({ body: schema.updateStatusSchema }), asyncHandler(async (req, res) => {
  const order = await ordersService.updateStatus(req.params.orderNumber, req.body.status, {
    actorId: req.user.id,
    note: req.body.note,
  });
  ok(res, order, { message: 'تم تحديث حالة الطلب' });
}));

export default router;
