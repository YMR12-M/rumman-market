/**
 * ═══════════════════════════════════════════════════════════════
 *  مسارات الدفع
 *
 *  ملاحظة أمان على نقطة الـ webhook: هي المسار الوحيد المفتوح بلا
 *  مصادقة في هذا الملف، لأن فوري تستدعيها من خوادمها. حمايتها تأتي
 *  من التوقيع المُتحقَّق منه داخل الخدمة لا من شيء آخر — ولذلك
 *  نُرجع 200 دائمًا حتى عند الرفض، فالمزوّد يعيد الإرسال بلا نهاية
 *  إن رأى خطأً، ونحن نريد أثرًا مؤرشفًا لا حلقة إعادة.
 * ═══════════════════════════════════════════════════════════════
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { atLeast } from '../../middleware/authorize.js';
import { writeLimiter } from '../../middleware/rateLimiters.js';
import { uploadImage, BUCKETS } from '../../middleware/upload.js';
import { ROLES } from '../../config/constants.js';
import { paymentsService } from './payments.service.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/* ── عام: وسائل الدفع المتاحة (تبني منها الواجهة شاشة الدفع) ──── */
router.get('/methods', asyncHandler(async (_req, res) => {
  ok(res, { methods: paymentsService.availableMethods() });
}));

/* ── webhook فوري — بلا مصادقة، محميّ بالتوقيع ─────────────────── */
router.post('/fawry/notify', asyncHandler(async (req, res) => {
  const result = await paymentsService.handleFawryNotification(req.body ?? {});
  if (result.error) logger.warn(`إشعار فوري مرفوض: ${result.error}`);
  // 200 دائمًا: الأرشفة تمّت، وإعادة الإرسال لن تُصلح توقيعًا خاطئًا
  res.status(200).json({ received: true });
}));

/* ── العميل: رفع إيصال تحويل إنستاباي ─────────────────────────── */
const proofSchema = z.object({
  sender_name: z.string().trim().min(2, 'اكتب اسم المحوِّل').max(120).optional(),
  transfer_reference: z.string().trim().min(3, 'اكتب رقم العملية').max(120).optional(),
});

router.post(
  '/instapay/:orderNumber/proof',
  authenticate,
  writeLimiter,
  uploadImage(BUCKETS.proofs, 'proof'),
  validate({ body: proofSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(422).json({
        success: false,
        message: 'أرفق صورة إيصال التحويل',
        code: 'PROOF_REQUIRED',
      });
    }

    const payment = await paymentsService.submitInstapayProof({
      orderNumber: req.params.orderNumber,
      userId: req.user.id,
      proofUrl: req.file.publicUrl,
      senderName: req.body.sender_name,
      transferReference: req.body.transfer_reference,
    });

    return ok(res, payment, { message: 'استلمنا الإيصال — نراجعه الآن ونبدأ التجهيز فور اعتماده.' });
  }),
);

/* ═══ لوحة الإدارة ═══════════════════════════════════════════════ */
const staff = [authenticate, atLeast(ROLES.BRANCH_MANAGER)];

/** طابور التحويلات المنتظرة قرارًا */
router.get('/review-queue', ...staff, asyncHandler(async (req, res) => {
  // مدير الفرع يرى فرعه فقط؛ المدير العام يرى الكلّ
  const branchId = req.user.role === ROLES.ADMIN
    ? (req.validatedQuery?.branch_id ?? req.query.branch_id ?? null)
    : req.user.default_branch_id;

  ok(res, await paymentsService.reviewQueue({ branchId: branchId ? Number(branchId) : null }));
}));

const reviewSchema = z.object({
  approved: z.boolean(),
  note: z.string().trim().max(255).optional(),
});

/** اعتماد أو رفض تحويل إنستاباي */
router.post(
  '/instapay/:orderNumber/review',
  ...staff,
  validate({ body: reviewSchema }),
  asyncHandler(async (req, res) => {
    const result = await paymentsService.reviewInstapay({
      orderNumber: req.params.orderNumber,
      reviewerId: req.user.id,
      approved: req.body.approved,
      note: req.body.note,
    });
    ok(res, result, { message: result.approved ? 'تم اعتماد التحويل' : 'تم رفض الإيصال وإبلاغ العميل' });
  }),
);

/** إعادة استعلام حالة الدفع من فوري */
router.post('/fawry/:orderNumber/refresh', ...staff, asyncHandler(async (req, res) => {
  ok(res, await paymentsService.refreshFawryStatus(req.params.orderNumber, req.user.id));
}));

/** تسجيل تحصيل نقدي عند التسليم */
router.post('/cod/:orderNumber/collect', ...staff, asyncHandler(async (req, res) => {
  const result = await paymentsService.collectCash(req.params.orderNumber, req.user.id);
  ok(res, result, { message: 'تم تسجيل التحصيل النقدي' });
}));

export default router;
