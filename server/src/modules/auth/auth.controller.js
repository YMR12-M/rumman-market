/**
 * وحدة التحكّم — مسؤولة فقط عن:
 *   قراءة المدخلات ← نداء الخدمة ← تشكيل الاستجابة.
 * أي منطق عمل هنا يُعتبر خطأ معماريًا؛ مكانه في auth.service.js
 */
import { authService } from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';

/** بيانات الجهاز تُحفظ مع الجلسة لعرضها في إعدادات الأمان */
const requestContext = (req) => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, requestContext(req));
    created(res, result, 'تم إنشاء حسابك — أهلًا بك في رُمّان');
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, requestContext(req));
    ok(res, result, { message: `أهلًا بعودتك، ${result.user.full_name.split(' ')[0]}` });
  }),

  refresh: asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refresh_token, requestContext(req));
    ok(res, result);
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.body?.refresh_token);
    ok(res, null, { message: 'تم تسجيل الخروج' });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);
    ok(res, null, { message: 'تم تسجيل الخروج من كل الأجهزة' });
  }),

  me: asyncHandler(async (req, res) => ok(res, req.user)),

  sessions: asyncHandler(async (req, res) => ok(res, await authService.listSessions(req.user.id))),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    ok(res, result, { message: 'إن كان البريد مسجّلًا فستصلك رسالة الاستعادة خلال دقائق' });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    ok(res, null, { message: 'تم تعيين كلمة المرور الجديدة' });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body.token);
    ok(res, result, { message: 'تم تفعيل بريدك' });
  }),

  resendVerification: asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.user.id);
    ok(res, result, {
      message: result.already_verified ? 'بريدك مفعّل بالفعل' : 'أرسلنا رابط التفعيل إلى بريدك',
    });
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body);
    ok(res, null, { message: 'تم تغيير كلمة المرور — سجّل الدخول من جديد' });
  }),
};
