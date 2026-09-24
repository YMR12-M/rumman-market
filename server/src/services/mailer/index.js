/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة البريد — Resend
 *
 *  قاعدتان تحكمان هذا الملف:
 *
 *  1) البريد لا يُسقِط طلبًا أبدًا. إن فشل الإرسال نسجّل الخطأ ونكمل،
 *     لأن العميل أنشأ حسابًا أو طلبًا فعلًا — ولا يصحّ أن يفشل ذلك
 *     لأن مزوّد البريد متوقّف.
 *
 *  2) إن لم يُضبَط المفتاح، نعمل في «وضع السجلّ»: نكتب الرسالة في
 *     سجلّ الخادم بدل إرسالها. هذا ليس وضع تجربة — هو ما يسمح
 *     بتشغيل النظام قبل اعتماد النطاق لدى Resend، وينبّه في كل مرّة.
 * ═══════════════════════════════════════════════════════════════
 */
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { templates } from './templates.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** بيانات العلامة التي تظهر في كل رسالة */
const brand = () => ({
  name: env.brand.name,
  tagline: env.brand.tagline,
  phone: env.brand.supportPhone,
  email: env.brand.supportEmail,
});

/** رابط مطلق داخل الواجهة */
const appLink = (path) => `${env.appUrl.replace(/\/$/, '')}${path}`;

/**
 * الإرسال الفعلي.
 * @returns {Promise<{ok: boolean, id?: string, reason?: string}>}
 */
async function deliver({ to, subject, html, replyTo }) {
  if (!env.mail.apiKey) {
    logger.warn(`[بريد غير مُرسَل — RESEND_API_KEY غير مضبوط] إلى ${to} · ${subject}`);
    return { ok: false, reason: 'MAIL_NOT_CONFIGURED' };
  }

  // مهلة صريحة: مزوّد بطيء يجب ألّا يعلّق طلب العميل
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.mail.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.mail.from,
        to: [to],
        subject,
        html,
        ...(replyTo || env.mail.replyTo ? { reply_to: replyTo || env.mail.replyTo } : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      logger.error(`فشل إرسال البريد إلى ${to}: ${payload?.message || response.status}`);
      return { ok: false, reason: payload?.message || `HTTP ${response.status}` };
    }

    logger.info(`بريد مُرسَل إلى ${to} · ${subject}`);
    return { ok: true, id: payload?.id };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'انتهت مهلة الاتصال بمزوّد البريد' : error.message;
    logger.error(`تعذّر إرسال البريد إلى ${to}: ${reason}`);
    return { ok: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}

export const mailer = {
  /** هل خدمة البريد مفعّلة فعليًا؟ تستخدمها الواجهة لإخفاء ما يعتمد عليها */
  get enabled() {
    return Boolean(env.mail.apiKey);
  },

  async sendVerifyEmail({ to, name, token }) {
    const { subject, html } = templates.verifyEmail({
      name, brand: brand(), link: appLink(`/verify-email?token=${encodeURIComponent(token)}`),
    });
    return deliver({ to, subject, html });
  },

  async sendPasswordReset({ to, name, token }) {
    const { subject, html } = templates.resetPassword({
      name, brand: brand(), link: appLink(`/reset-password?token=${encodeURIComponent(token)}`),
    });
    return deliver({ to, subject, html });
  },

  async sendOrderPlaced({ to, name, order, items }) {
    const { subject, html } = templates.orderPlaced({
      name, order, items, brand: brand(),
      link: appLink(`/account/orders/${order.order_number}`),
    });
    return deliver({ to, subject, html });
  },

  async sendOrderStatus({ to, name, order, statusLabel, statusNote }) {
    const { subject, html } = templates.orderStatus({
      name, order, statusLabel, statusNote, brand: brand(),
      link: appLink(`/account/orders/${order.order_number}`),
    });
    return deliver({ to, subject, html });
  },

  async sendPaymentConfirmed({ to, name, order }) {
    const { subject, html } = templates.paymentConfirmed({
      name, order, brand: brand(),
      link: appLink(`/account/orders/${order.order_number}`),
    });
    return deliver({ to, subject, html });
  },

  async sendFawryCode({ to, name, order, referenceNumber, expiresAt }) {
    const { subject, html } = templates.fawryCode({
      name, order, referenceNumber, expiresAt, brand: brand(),
      link: appLink(`/account/orders/${order.order_number}`),
    });
    return deliver({ to, subject, html });
  },
};

/**
 * إرسال لا ينتظر ولا يرمي — للاستدعاء داخل مسار طلب لا يجوز أن يتأخّر.
 * أي فشل يُسجَّل داخل `deliver` نفسها.
 */
export function sendInBackground(promiseFactory) {
  Promise.resolve()
    .then(promiseFactory)
    .catch((error) => logger.error(`خطأ غير متوقّع في إرسال البريد: ${error.message}`));
}
