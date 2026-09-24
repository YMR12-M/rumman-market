import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiters.js';
import * as schema from './auth.validation.js';

const router = Router();

/** المسارات العامة — محميّة بحدّ معدّل مشدّد */
router.post('/register',        authLimiter, validate({ body: schema.registerSchema }),       authController.register);
router.post('/login',           authLimiter, validate({ body: schema.loginSchema }),          authController.login);
router.post('/refresh',                      validate({ body: schema.refreshSchema }),        authController.refresh);
router.post('/logout',                                                                        authController.logout);
router.post('/forgot-password', authLimiter, validate({ body: schema.forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password',  authLimiter, validate({ body: schema.resetPasswordSchema }),  authController.resetPassword);
router.post('/verify-email',    authLimiter, validate({ body: schema.verifyEmailSchema }),    authController.verifyEmail);

/** المسارات المحمية */
router.get('/me',               authenticate, authController.me);
router.get('/sessions',         authenticate, authController.sessions);
router.post('/logout-all',      authenticate, authController.logoutAll);
router.post('/change-password', authenticate, validate({ body: schema.changePasswordSchema }), authController.changePassword);
router.post('/resend-verification', authenticate, authLimiter,                                 authController.resendVerification);

export default router;
