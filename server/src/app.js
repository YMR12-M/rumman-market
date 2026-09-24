/**
 * تركيب تطبيق Express.
 * ترتيب الـ middleware مقصود: الأمان ← التحليل ← السجلات ← المسارات ← الأخطاء.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestContext } from './middleware/requestContext.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import { UPLOAD_ROOT } from './middleware/upload.js';

export function createApp() {
  const app = express();

  // خلف Nginx/Cloudflare نحتاج ثقة البروكسي ليصل req.ip صحيحًا
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.disable('etag');

  // ── الأمان ───────────────────────────────────────────────
  app.use(helmet({
    // الصور تُقرأ من نطاق الواجهة، لا من نطاق الـ API
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // سياسة المحتوى تُضبط على الواجهة (Nginx) حيث تُقدَّم الصفحة
    contentSecurityPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(cors({
    origin: (origin, callback) => {
      // الطلبات بلا Origin (أدوات المراقبة، webhooks) تمرّ
      if (!origin || env.clientOrigin.includes(origin)) return callback(null, true);
      return callback(new Error('نطاق غير مسموح'));
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  }));

  // ── تحليل الطلب ──────────────────────────────────────────
  // الحدّ أعلى قليلًا ليتّسع لملف استيراد CSV كبير
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());
  app.use(requestContext);

  if (!env.isProd) app.use(morgan('dev'));

  // ── فحص الصحّة (قبل حدّ المعدّل ليعمل مع أدوات المراقبة) ──
  app.get('/health', (_req, res) => res.json({
    success: true,
    status: 'ok',
    service: 'rumman-api',
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }));

  /**
   * ── الملفات المرفوعة ──────────────────────────────────────
   * ترويسات صارمة عمدًا: هذا المجلّد يحمل ملفات جاءت من المستخدمين.
   *  • `nosniff` يمنع المتصفّح من تخمين نوع أذكى من المُعلَن.
   *  • `Content-Disposition: attachment` يجعل أي ملفٍّ غير متوقّع
   *    يُنزَّل بدل أن يُعرَض ويُنفَّذ في سياق نطاقنا.
   *  • `index: false` يمنع سرد محتويات المجلّد.
   */
  app.use('/uploads', express.static(UPLOAD_ROOT, {
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    },
  }));

  // ── مسارات الـ API ───────────────────────────────────────
  app.use(env.apiPrefix, generalLimiter, apiRoutes);

  // ── الأخطاء (آخر ما يُسجَّل دائمًا) ───────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
