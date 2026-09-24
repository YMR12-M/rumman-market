/**
 * ═══════════════════════════════════════════════════════════════
 *  مسارات لوحة الإدارة
 *
 *  كل شيء هنا خلف `authenticate`. وما يبني الكتالوج (فروع، أقسام،
 *  منتجات، كوبونات، مستخدمون، إعدادات) خلف `admin` وحده، لأن مدير
 *  الفرع يدير فرعه لا هوية المتجر. ما يخصّ التشغيل اليومي (المخزون،
 *  الطلبات، الجرد) متاح لمدير الفرع أيضًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/response.js';
import { getPagination } from '../../utils/pagination.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize, atLeast } from '../../middleware/authorize.js';
import { uploadImage, BUCKETS } from '../../middleware/upload.js';
import { ROLES } from '../../config/constants.js';
import { mailer } from '../../services/mailer/index.js';
import { env } from '../../config/env.js';
import * as admin from './admin.service.js';
import * as importer from './admin.import.js';
import * as schema from './admin.validation.js';

const router = Router();
router.use(authenticate);

/** سياق كل عملية كتابة — يُسجَّل في سجلّ التدقيق */
const ctx = (req) => ({ actorId: req.user.id, ip: req.ip });

/** قراءة الـ query بعد التحقّق (Express 5 يجعل req.query للقراءة فقط) */
const q = (req) => req.validatedQuery || req.query;

/** ما يبني هوية المتجر — للمدير العام فقط */
const adminOnly = authorize(ROLES.ADMIN);
/** ما يخصّ التشغيل اليومي — لمدير الفرع فما فوق */
const managerUp = atLeast(ROLES.BRANCH_MANAGER);

/**
 * يبني مسارات CRUD الخمسة لكيان واحد.
 * الفائدة ليست تقليل الأسطر فقط، بل ضمان أن الكيانات التسعة تتصرّف
 * بنفس الطريقة تمامًا: نفس أكواد الحالة ونفس شكل الاستجابة.
 */
function mountCrud(path, entity, schemas, { guard = adminOnly, listFn, detailFn } = {}) {
  const base = Router();
  base.use(guard);

  base.get('/', asyncHandler(async (_req, res) => ok(res, listFn ? await listFn() : await entity.list())));

  base.get('/:id', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
    ok(res, detailFn ? await detailFn(req.params.id) : await entity.find(req.params.id))));

  base.post('/', validate({ body: schemas.create }), asyncHandler(async (req, res) =>
    created(res, await entity.create(req.body, ctx(req)), `تم إنشاء ${entity.label}`)));

  base.patch('/:id', validate({ params: schema.idParam, body: schemas.update }), asyncHandler(async (req, res) =>
    ok(res, await entity.update(req.params.id, req.body, ctx(req)), { message: `تم تحديث ${entity.label}` })));

  base.delete('/:id', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
    ok(res, await entity.remove(req.params.id, ctx(req)), { message: `تم حذف ${entity.label}` })));

  base.post('/:id/restore', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
    ok(res, await entity.restore(req.params.id, ctx(req)), { message: `تم استرجاع ${entity.label}` })));

  router.use(path, base);
  return base;
}

/* ═══ لوحة الحالة ═════════════════════════════════════════════════ */

/** قائمة تحقّق: ما ينقص المتجر ليصير قابلًا للبيع */
router.get('/readiness', managerUp, asyncHandler(async (_req, res) => ok(res, await admin.readiness())));

/** حالة الخدمات الخارجية — يراها المدير قبل النشر */
router.get('/health', adminOnly, asyncHandler(async (_req, res) => {
  ok(res, {
    mail: { provider: 'resend', configured: mailer.enabled, from: env.mail.from },
    payments: {
      cod: env.payments.cod.enabled,
      instapay: env.payments.instapay.enabled && Boolean(env.payments.instapay.address),
      fawry: env.payments.fawry.enabled,
      fawry_environment: env.payments.fawry.baseUrl.includes('staging') ? 'اختبار' : 'إنتاج',
    },
    uploads: { max_file_mb: env.uploads.maxFileMb, cdn: Boolean(env.uploads.publicUrl) },
    app_url: env.appUrl,
    api_public_url: env.apiPublicUrl,
    environment: env.nodeEnv,
  });
}));

/* ═══ الفروع ══════════════════════════════════════════════════════ */

const branchRoutes = mountCrud('/branches', admin.branches, {
  create: schema.branchCreate,
  update: schema.branchUpdate,
}, { listFn: () => admin.branchExtras.listWithStats() });

branchRoutes.get('/:id/hours', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.branchExtras.hours(req.params.id))));

branchRoutes.put('/:id/hours', validate({ params: schema.idParam, body: schema.branchHours }), asyncHandler(async (req, res) =>
  ok(res, await admin.branchExtras.replaceHours(req.params.id, req.body.hours, ctx(req)), { message: 'تم تحديث مواعيد العمل' })));

branchRoutes.get('/:id/zones', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.branchExtras.zones(req.params.id))));

branchRoutes.post('/:id/zones', validate({ params: schema.idParam, body: schema.zoneCreate }), asyncHandler(async (req, res) =>
  created(res, await admin.zones.create({ ...req.body, branch_id: Number(req.params.id) }, ctx(req)), 'تمت إضافة منطقة التوصيل')));

/* ═══ مناطق التوصيل (تعديل وحذف مستقلّان) ═════════════════════════ */

const zoneRouter = Router();
zoneRouter.use(adminOnly);

zoneRouter.patch('/:id', validate({ params: schema.idParam, body: schema.zoneUpdate }), asyncHandler(async (req, res) =>
  ok(res, await admin.zones.update(req.params.id, req.body, ctx(req)), { message: 'تم تحديث المنطقة' })));

zoneRouter.delete('/:id', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.zones.remove(req.params.id, ctx(req)), { message: 'تم حذف المنطقة' })));

router.use('/delivery-zones', zoneRouter);

/* ═══ الأقسام ═════════════════════════════════════════════════════ */

const categoryRoutes = mountCrud('/categories', admin.categories, {
  create: schema.categoryCreate,
  update: schema.categoryUpdate,
});

categoryRoutes.post('/reorder', validate({ body: schema.reorderPayload }), asyncHandler(async (req, res) =>
  ok(res, await admin.categories.reorder(req.body.order, ctx(req)), { message: 'تم تحديث الترتيب' })));

/** مفاتيح الزخارف المتاحة — تبني منها اللوحة قائمة الاختيار */
categoryRoutes.get('/meta/motifs', asyncHandler(async (_req, res) => ok(res, { motifs: schema.MOTIF_KEYS })));

/* ═══ العلامات التجارية ═══════════════════════════════════════════ */

mountCrud('/brands', admin.brands, { create: schema.brandCreate, update: schema.brandUpdate });

/* ═══ المنتجات ════════════════════════════════════════════════════ */

const productRoutes = Router();
productRoutes.use(adminOnly);

productRoutes.get('/', validate({ query: schema.adminProductQuery }), asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, total } = await admin.productExtras.list({ ...q(req), ...pagination });
  paginated(res, items, { ...pagination, total });
}));

productRoutes.get('/:id', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.productExtras.detail(req.params.id))));

productRoutes.post('/', validate({ body: schema.productCreate }), asyncHandler(async (req, res) =>
  created(res, await admin.products.create(req.body, ctx(req)), 'تم إنشاء المنتج')));

productRoutes.patch('/:id', validate({ params: schema.idParam, body: schema.productUpdate }), asyncHandler(async (req, res) =>
  ok(res, await admin.products.update(req.params.id, req.body, ctx(req)), { message: 'تم تحديث المنتج' })));

productRoutes.delete('/:id', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.products.remove(req.params.id, ctx(req)), { message: 'تم حذف المنتج' })));

productRoutes.post('/:id/restore', validate({ params: schema.idParam }), asyncHandler(async (req, res) =>
  ok(res, await admin.products.restore(req.params.id, ctx(req)), { message: 'تم استرجاع المنتج' })));

/* ── صور المنتج ──────────────────────────────────────────────── */

const imageMeta = z.object({
  alt_ar: z.string().trim().max(180).optional(),
  is_primary: z.union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .transform((value) => value === true || value === 'true' || value === '1')
    .optional(),
});

productRoutes.post(
  '/:id/images',
  validate({ params: schema.idParam }),
  uploadImage(BUCKETS.products, 'image'),
  validate({ body: imageMeta }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(422).json({ success: false, message: 'اختر صورة للرفع', code: 'IMAGE_REQUIRED' });
    }
    const image = await admin.productExtras.addImage(req.params.id, {
      url: req.file.publicUrl,
      altAr: req.body.alt_ar,
      isPrimary: req.body.is_primary ?? false,
    }, ctx(req));
    return created(res, image, 'تم رفع الصورة');
  }),
);

productRoutes.delete('/:id/images/:imageId', validate({ params: schema.idParam.extend({ imageId: z.coerce.number().int().positive() }) }),
  asyncHandler(async (req, res) =>
    ok(res, await admin.productExtras.removeImage(req.params.id, req.params.imageId, ctx(req)), { message: 'تم حذف الصورة' })));

productRoutes.post('/:id/images/:imageId/primary', validate({ params: schema.idParam.extend({ imageId: z.coerce.number().int().positive() }) }),
  asyncHandler(async (req, res) =>
    ok(res, await admin.productExtras.setPrimaryImage(req.params.id, req.params.imageId, ctx(req)), { message: 'تم تعيين الصورة الرئيسية' })));

router.use('/products', productRoutes);

/* ═══ الاستيراد من CSV ════════════════════════════════════════════ */

const importRouter = Router();
importRouter.use(adminOnly);

/** الأعمدة المتوقّعة — تشرحها اللوحة للمستخدم قبل الرفع */
importRouter.get('/columns', asyncHandler(async (_req, res) =>
  ok(res, { columns: importer.IMPORT_COLUMNS })));

/** قالب جاهز للتنزيل */
importRouter.get('/template', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rumman-products-template.csv"');
  res.send(importer.templateCsv());
});

/**
 * معاينة أو تطبيق.
 * `commit=false` (الافتراضي) يفحص ولا يكتب — ونفرض ذلك كخطوة أولى
 * دائمًا في اللوحة، فلا يُطبَّق ملفٌّ لم يُراجَع تقريره.
 */
importRouter.post('/products', validate({ body: schema.importPayload }), asyncHandler(async (req, res) => {
  const { rows, errors } = importer.analyze(req.body.csv);

  if (!req.body.commit) {
    return ok(res, {
      mode: 'preview',
      valid_count: rows.length,
      error_count: errors.length,
      errors: errors.slice(0, 200),
      sample: rows.slice(0, 10),
    }, { message: errors.length ? `${errors.length} سطرًا يحتاج تصحيحًا` : `${rows.length} صنفًا جاهزًا للاستيراد` });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: `صحّح ${errors.length} سطرًا قبل التطبيق`,
      code: 'IMPORT_HAS_ERRORS',
      data: { errors: errors.slice(0, 200) },
    });
  }

  if (rows.length === 0) {
    return res.status(422).json({ success: false, message: 'لا يوجد صنف صالح في الملف', code: 'IMPORT_EMPTY' });
  }

  const result = await importer.apply({
    rows,
    branchId: req.body.branch_id ?? null,
    actorId: req.user.id,
    ip: req.ip,
  });

  return ok(res, { mode: 'commit', ...result }, {
    message: `تم الاستيراد: ${result.created} صنفًا جديدًا · ${result.updated} تحديثًا`,
  });
}));

router.use('/import', importRouter);

/* ═══ المخزون — متاح لمدير الفرع ═══════════════════════════════════ */

const inventoryRouter = Router();
inventoryRouter.use(managerUp);

/**
 * مدير الفرع مقيَّد بفرعه.
 * لا نعتمد على أن الواجهة سترسل الفرع الصحيح — نفرضه في الخادم.
 */
const scopedBranch = (req, requested) => {
  if (req.user.role === ROLES.ADMIN) return Number(requested);
  if (!req.user.default_branch_id) {
    return null; // يُترجَم إلى 400 في المسار
  }
  return Number(req.user.default_branch_id);
};

const inventoryQuery = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(120).optional(),
  low: z.enum(['0', '1']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

inventoryRouter.get('/', validate({ query: inventoryQuery }), asyncHandler(async (req, res) => {
  const branchId = scopedBranch(req, q(req).branch_id);
  if (!branchId) {
    return res.status(400).json({ success: false, message: 'اختر الفرع', code: 'BRANCH_REQUIRED' });
  }

  const pagination = getPagination(q(req));
  const { items, total } = await admin.inventory.byBranch(branchId, {
    q: q(req).q,
    lowOnly: q(req).low === '1',
    ...pagination,
  });
  return paginated(res, items, { ...pagination, total });
}));

inventoryRouter.put('/', validate({ body: schema.inventoryUpsert }), asyncHandler(async (req, res) => {
  const branchId = scopedBranch(req, req.body.branch_id);
  ok(res, await admin.inventory.upsert({ ...req.body, branch_id: branchId }, ctx(req)), { message: 'تم تحديث المخزون' });
}));

inventoryRouter.post('/adjust', validate({ body: schema.stockAdjust }), asyncHandler(async (req, res) => {
  const branchId = scopedBranch(req, req.body.branch_id);
  ok(res, await admin.inventory.adjust({ ...req.body, branch_id: branchId }, ctx(req)), { message: 'تم تسجيل الحركة' });
}));

/** نشر منتج على عدّة فروع — للمدير العام فقط */
inventoryRouter.post('/bulk', adminOnly, validate({ body: schema.bulkStock }), asyncHandler(async (req, res) =>
  ok(res, await admin.inventory.bulkSet(req.body, ctx(req)), { message: 'تم نشر المنتج على الفروع' })));

inventoryRouter.get('/movements', asyncHandler(async (req, res) => {
  const branchId = scopedBranch(req, req.query.branch_id);
  const productId = Number(req.query.product_id);
  if (!branchId || !productId) {
    return res.status(400).json({ success: false, message: 'حدّد الفرع والمنتج', code: 'PARAMS_REQUIRED' });
  }
  return ok(res, await admin.inventory.movements(branchId, productId));
}));

router.use('/inventory', inventoryRouter);

/* ═══ الطلبات ═════════════════════════════════════════════════════ */

router.get('/orders', managerUp, validate({ query: schema.adminOrderQuery }), asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const branchId = req.user.role === ROLES.ADMIN ? q(req).branch_id : req.user.default_branch_id;
  const { items, total } = await admin.orders.list({ ...q(req), branch_id: branchId, ...pagination });
  paginated(res, items, { ...pagination, total });
}));

/* ═══ الكوبونات والعروض ═══════════════════════════════════════════ */

mountCrud('/coupons', admin.coupons, { create: schema.couponCreate, update: schema.couponUpdate });

const promotionRoutes = mountCrud('/promotions', admin.promotions, {
  create: schema.promotionCreate,
  update: schema.promotionUpdate,
});

promotionRoutes.post('/reorder', validate({ body: schema.reorderPayload }), asyncHandler(async (req, res) =>
  ok(res, await admin.promotions.reorder(req.body.order, ctx(req)), { message: 'تم تحديث الترتيب' })));

/* ═══ المستخدمون ══════════════════════════════════════════════════ */

const userRouter = Router();
userRouter.use(adminOnly);

userRouter.get('/', validate({ query: schema.adminUserQuery }), asyncHandler(async (req, res) => {
  const pagination = getPagination(q(req));
  const { items, total } = await admin.users.list({ ...q(req), ...pagination });
  paginated(res, items, { ...pagination, total });
}));

userRouter.post('/staff', validate({ body: schema.staffCreate }), asyncHandler(async (req, res) =>
  created(res, await admin.users.createStaff(req.body, ctx(req)), 'تم إنشاء حساب الفريق')));

userRouter.patch('/:id', validate({ params: schema.idParam, body: schema.userUpdate }), asyncHandler(async (req, res) =>
  ok(res, await admin.users.update(req.params.id, req.body, ctx(req)), { message: 'تم تحديث الحساب' })));

router.use('/users', userRouter);

/* ═══ الإعدادات وسجلّ التدقيق ═════════════════════════════════════ */

router.get('/settings', adminOnly, asyncHandler(async (_req, res) => ok(res, await admin.settings.all())));

router.put('/settings', adminOnly, validate({ body: schema.settingsUpdate }), asyncHandler(async (req, res) =>
  ok(res, await admin.settings.saveMany(req.body.settings, ctx(req)), { message: 'تم حفظ الإعدادات' })));

router.get('/audit', adminOnly, asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  ok(res, await admin.auditLog.list({ ...pagination, entity: req.query.entity }));
}));

export default router;
