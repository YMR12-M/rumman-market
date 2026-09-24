/**
 * نقطة تشغيل السيرفر.
 * نفصلها عن app.js حتى نتمكّن من استيراد التطبيق في الاختبارات
 * دون فتح منفذ شبكة.
 */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { assertDatabaseConnection, pool } from './config/db.js';
import { ensureUploadDirs } from './middleware/upload.js';
import { mailer } from './services/mailer/index.js';
import { logger } from './utils/logger.js';

const app = createApp();

const banner = `
  ╭──────────────────────────────────────────────╮
  │   رُمّان · RUMMAN MARKET API                   │
  │   المنفذ: ${String(env.port).padEnd(34)}│
  │   البيئة: ${env.nodeEnv.padEnd(34)}│
  │   الجذر:  ${`http://localhost:${env.port}${env.apiPrefix}`.padEnd(34)}│
  ╰──────────────────────────────────────────────╯`;

await ensureUploadDirs();

const server = app.listen(env.port, async () => {
  console.log(banner);

  const connected = await assertDatabaseConnection();
  if (!connected) {
    logger.error('لا اتصال بقاعدة البيانات — شغّل MySQL ثم: npm run db:migrate');
    if (env.isProd) process.exit(1);
  }

  /* تنبيهات تشغيل: ما ليس مضبوطًا يُقال الآن لا عند أول فشل */
  if (!mailer.enabled) {
    logger.warn('البريد غير مضبوط (RESEND_API_KEY) — الرسائل تُكتب في السجلّ ولا تُرسَل');
  }

  const active = [
    env.payments.cod.enabled && 'كاش',
    env.payments.instapay.enabled && 'إنستاباي',
    env.payments.fawry.enabled && 'فوري',
  ].filter(Boolean);

  if (active.length === 0) logger.error('لا وسيلة دفع مفعّلة — لن يتمكّن أي عميل من إتمام طلب');
  else logger.info(`وسائل الدفع المفعّلة: ${active.join(' · ')}`);

  if (env.payments.fawry.enabled && env.payments.fawry.baseUrl.includes('staging')) {
    logger.warn('فوري تعمل على بيئة الاختبار (staging) — لا تحصيل فعلي');
  }
});

/** إيقاف نظيف: ننهي الطلبات الجارية ونغلق تجمّع الاتصالات */
async function shutdown(signal) {
  logger.warn(`استُقبلت الإشارة ${signal} — إيقاف نظيف...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    logger.success('تم إغلاق السيرفر');
    process.exit(0);
  });
  // مهلة قصوى للإيقاف قبل الإنهاء القسري
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error(`رفض غير معالَج: ${reason}`));
process.on('uncaughtException', (error) => {
  logger.error(`استثناء غير ملتقط: ${error.message}`);
  process.exit(1);
});
