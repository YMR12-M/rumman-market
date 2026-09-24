/**
 * حدود المعدّل (Rate Limiting) — حماية من إساءة الاستخدام.
 * حدّ صارم على مسارات المصادقة لأنها الهدف الأول لهجمات التخمين.
 */
import rateLimit from 'express-rate-limit';

const message = (text) => ({ success: false, message: text, code: 'RATE_LIMITED' });

/** حدّ عام لكل الـ API */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('طلبات كثيرة جدًا — حاول بعد دقيقة'),
});

/** حدّ مشدّد لتسجيل الدخول/التسجيل/استعادة كلمة المرور */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('محاولات دخول كثيرة — انتظر ١٥ دقيقة'),
});

/** حدّ متوسّط لعمليات الكتابة (طلبات، تقييمات، رسائل) */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('أبطئ قليلًا من فضلك'),
});
