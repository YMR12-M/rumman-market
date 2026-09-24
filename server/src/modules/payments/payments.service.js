/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة الدفع
 *
 *  ثلاث وسائل، ثلاثة تدفّقات مختلفة جوهريًا:
 *
 *  ١) كاش (cod)
 *     يُحصَّل عند التسليم. الطلب يبدأ مباشرة `pending/unpaid`
 *     ولا شيء آخر مطلوب.
 *
 *  ٢) إنستاباي (instapay)
 *     لا واجهة برمجية للتجّار في الشبكة المصرية، فالتدفّق الحقيقي:
 *       العميل يحوّل إلى عنواننا ← يرفع صورة الإيصال ورقم العملية
 *       ← الطلب `under_review` ← الفريق يعتمد أو يرفض من اللوحة.
 *     لا شيء يُعتبر مدفوعًا إلا باعتماد بشري مسجَّل باسم من اعتمده.
 *
 *  ٣) فوري (fawry)
 *     تكامل فعلي: نطلب كود دفع، والعميل يدفعه في أي منفذ، وفوري
 *     تستدعي webhook عندنا فنعتمد الطلب آليًا بتوقيع مُتحقَّق منه.
 *
 *  قاعدة تحكم الملف كلّه: **الانتقال إلى «مدفوع» يحدث في مكان واحد**
 *  هو `markPaid` — فلا يوجد مسار جانبي يمكن أن يعلن طلبًا مدفوعًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { fawryGateway, mapFawryStatus, verifyNotificationSignature } from './fawry.gateway.js';
import { mailer, sendInBackground } from '../../services/mailer/index.js';

/** الوسائل المتاحة فعليًا الآن — الواجهة تبني منها شاشة الدفع */
export function availableMethods() {
  const methods = [];

  if (env.payments.cod.enabled) {
    methods.push({
      key: 'cod',
      label: 'الدفع عند الاستلام',
      note: 'ادفع نقدًا لمندوب التوصيل أو عند الاستلام من الفرع.',
      instant: false,
    });
  }

  if (env.payments.instapay.enabled && env.payments.instapay.address) {
    methods.push({
      key: 'instapay',
      label: 'إنستاباي',
      note: 'حوّل المبلغ ثم ارفع صورة الإيصال — نراجعه خلال دقائق ونبدأ التجهيز.',
      instant: false,
      instructions: {
        address: env.payments.instapay.address,
        account_name: env.payments.instapay.accountName,
        window_hours: env.payments.instapay.proofWindowHours,
      },
    });
  }

  if (env.payments.fawry.enabled) {
    methods.push({
      key: 'fawry',
      label: 'فوري',
      note: 'نعطيك كودًا تدفعه من أي منفذ فوري أو من تطبيق myFawry.',
      instant: false,
    });
  }

  return methods;
}

/** هل الوسيلة متاحة؟ يُستدعى قبل إنشاء أي طلب */
export function assertMethodEnabled(method) {
  if (method === 'wallet') return; // المحفظة رصيد داخلي، لا تمرّ ببوّابة
  const allowed = availableMethods().some((item) => item.key === method);
  if (!allowed) {
    throw ApiError.badRequest('وسيلة الدفع هذه غير متاحة حاليًا', { code: 'PAYMENT_METHOD_UNAVAILABLE' });
  }
}

/** حالة الدفع الابتدائية للطلب حسب الوسيلة */
export function initialPaymentStatus(method) {
  if (method === 'wallet') return 'paid';
  if (method === 'cod') return 'unpaid';
  return 'awaiting_payment'; // instapay · fawry
}

/** حالة سجلّ الدفع الابتدائية */
export function initialPaymentRecordStatus(method) {
  if (method === 'wallet') return 'succeeded';
  if (method === 'instapay') return 'awaiting_proof';
  return 'pending';
}

export const paymentsService = {
  availableMethods,
  assertMethodEnabled,
  initialPaymentStatus,
  initialPaymentRecordStatus,

  /** آخر سجلّ دفع للطلب */
  latestForOrder(orderId) {
    return queryOne(
      `SELECT id, provider, amount, status, transaction_ref, fawry_reference, expires_at,
              proof_url, proof_uploaded_at, sender_name, review_note, reviewed_at, created_at
         FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
      [orderId],
    );
  },

  /**
   * تجهيز وسيلة الدفع بعد إنشاء الطلب مباشرة.
   * يُستدعى **خارج** معاملة الطلب عمدًا: نداء الشبكة لفوري قد يتأخّر
   * ثوانيَ، وإبقاء معاملة قاعدة البيانات مفتوحة طوال ذلك يقفل صفوف
   * المخزون أمام بقيّة العملاء.
   *
   * @returns {Promise<object|null>} تعليمات يعرضها العميل، أو null للكاش
   */
  async prepare({ order, customer, items }) {
    if (order.payment_method === 'cod' || order.payment_method === 'wallet') return null;

    if (order.payment_method === 'instapay') {
      return {
        method: 'instapay',
        address: env.payments.instapay.address,
        account_name: env.payments.instapay.accountName,
        amount: Number(order.grand_total),
        window_hours: env.payments.instapay.proofWindowHours,
        next_step: 'حوّل المبلغ ثم ارفع صورة الإيصال من صفحة الطلب.',
      };
    }

    if (order.payment_method === 'fawry') {
      try {
        const charge = await fawryGateway.createCharge({ order, customer, items });

        await execute(
          `UPDATE payments SET fawry_reference = ?, transaction_ref = ?, expires_at = ?, raw_response = ?
            WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
          [charge.referenceNumber, charge.referenceNumber, charge.expiresAt, JSON.stringify(charge.raw), order.id],
        );

        sendInBackground(() => mailer.sendFawryCode({
          to: customer.email,
          name: customer.full_name,
          order,
          referenceNumber: charge.referenceNumber,
          expiresAt: charge.expiresAt.toLocaleString('ar-EG'),
        }));

        return {
          method: 'fawry',
          reference_number: charge.referenceNumber,
          amount: Number(order.grand_total),
          expires_at: charge.expiresAt,
          next_step: 'ادفع بهذا الكود من أي منفذ فوري أو من تطبيق myFawry.',
        };
      } catch (error) {
        /**
         * فشل البوّابة لا يلغي الطلب — الأصناف محجوزة فعلًا والعميل
         * أتمّ عمليته. نعلّم الدفع فاشلًا ونترك للعميل تغيير الوسيلة.
         */
        await execute(
          "UPDATE payments SET status = 'failed', review_note = ? WHERE order_id = ? ORDER BY id DESC LIMIT 1",
          [String(error.message).slice(0, 255), order.id],
        );
        await execute("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [order.id]);
        throw error;
      }
    }

    return null;
  },

  /**
   * رفع إيصال تحويل إنستاباي.
   * العميل هو من يستدعيها، ولذلك نتحقّق من ملكيّته للطلب أولًا.
   */
  async submitInstapayProof({ orderNumber, userId, proofUrl, senderName, transferReference }) {
    const order = await queryOne(
      `SELECT id, order_number, user_id, status, payment_method, payment_status, grand_total
         FROM orders WHERE order_number = ? LIMIT 1`,
      [orderNumber],
    );

    if (!order || order.user_id !== userId) throw ApiError.notFound('الطلب غير موجود');
    if (order.payment_method !== 'instapay') {
      throw ApiError.badRequest('هذا الطلب ليس بوسيلة إنستاباي', { code: 'WRONG_METHOD' });
    }
    if (order.payment_status === 'paid') {
      throw ApiError.conflict('هذا الطلب مدفوع بالفعل', { code: 'ALREADY_PAID' });
    }
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw ApiError.conflict('لا يمكن رفع إيصال لطلب ملغى', { code: 'ORDER_CLOSED' });
    }

    await transaction(async (cx) => {
      await cx.execute(
        `UPDATE payments
            SET status = 'under_review', proof_url = ?, proof_uploaded_at = NOW(),
                sender_name = ?, transaction_ref = ?, review_note = NULL
          WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
        [proofUrl, senderName ?? null, transferReference ?? null, order.id],
      );
      await cx.execute("UPDATE orders SET payment_status = 'under_review' WHERE id = ?", [order.id]);
      await cx.execute(
        `INSERT INTO order_status_history (order_id, status, note, changed_by)
         VALUES (?, ?, 'رفع العميل إيصال تحويل إنستاباي', ?)`,
        [order.id, order.status, userId],
      );
    });

    logger.info(`إيصال إنستاباي مرفوع للطلب ${orderNumber}`);
    return this.latestForOrder(order.id);
  },

  /**
   * اعتماد أو رفض تحويل إنستاباي — من لوحة الإدارة فقط.
   * كل قرار يُسجَّل باسم من اتّخذه ووقته، ويُكتب في سجلّ التدقيق.
   */
  async reviewInstapay({ orderNumber, reviewerId, approved, note }) {
    const order = await queryOne(
      `SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status, o.grand_total,
              u.email, u.full_name
         FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.order_number = ? LIMIT 1`,
      [orderNumber],
    );

    if (!order) throw ApiError.notFound('الطلب غير موجود');
    if (order.payment_method !== 'instapay') {
      throw ApiError.badRequest('هذا الطلب ليس بوسيلة إنستاباي', { code: 'WRONG_METHOD' });
    }
    if (order.payment_status === 'paid') {
      throw ApiError.conflict('هذا الطلب معتمد بالفعل', { code: 'ALREADY_PAID' });
    }

    if (approved) {
      await this.markPaid({ orderId: order.id, reviewerId, note: note ?? 'اعتماد تحويل إنستاباي' });
      sendInBackground(() => mailer.sendPaymentConfirmed({ to: order.email, name: order.full_name, order }));
      return { approved: true };
    }

    await transaction(async (cx) => {
      await cx.execute(
        `UPDATE payments SET status = 'awaiting_proof', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
          WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
        [reviewerId, note ?? 'الإيصال غير مطابق', order.id],
      );
      await cx.execute("UPDATE orders SET payment_status = 'awaiting_payment' WHERE id = ?", [order.id]);
      await cx.execute(
        `INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)`,
        [order.id, order.status, `رُفض الإيصال: ${note ?? 'غير مطابق'}`, reviewerId],
      );
      await cx.execute(
        `INSERT INTO notifications (user_id, type, title, body, link)
         SELECT user_id, 'order', 'نحتاج مراجعة إيصال التحويل', ?, ? FROM orders WHERE id = ?`,
        [`لم نتمكّن من مطابقة التحويل لطلب ${order.order_number}. ${note ?? ''}`.trim(),
         `/account/orders/${order.order_number}`, order.id],
      );
      await cx.execute(
        `INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta)
         VALUES (?, 'payment.reject', 'order', ?, ?)`,
        [reviewerId, order.id, JSON.stringify({ order_number: order.order_number, note })],
      );
    });

    return { approved: false };
  },

  /**
   * ⚑ النقطة الوحيدة التي يصير فيها طلبٌ مدفوعًا.
   * تُستدعى من: اعتماد إنستاباي، إشعار فوري، تحصيل الكاش عند التسليم.
   */
  async markPaid({ orderId, reviewerId = null, note = 'تأكيد الدفع', transactionRef = null }) {
    return transaction(async (cx) => {
      const [[order]] = await cx.execute(
        'SELECT id, order_number, user_id, status, payment_status FROM orders WHERE id = ? FOR UPDATE',
        [orderId],
      );
      if (!order) throw ApiError.notFound('الطلب غير موجود');

      // حارس التكرار: إشعار فوري قد يصل مرّتين لنفس العملية
      if (order.payment_status === 'paid') return { already: true };

      await cx.execute(
        `UPDATE payments
            SET status = 'succeeded', reviewed_by = ?, reviewed_at = NOW(),
                review_note = ?, transaction_ref = COALESCE(?, transaction_ref)
          WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
        [reviewerId, note, transactionRef, orderId],
      );
      await cx.execute("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);

      /**
       * الطلب المدفوع يتأكّد تلقائيًا ويدخل طابور التجهيز.
       * نكتب سطرًا واحدًا في الخط الزمني لا سطرين: سطرٌ بحالة الطلب
       * الجديدة يحمل سبب الدفع. سطران يجعلان الترتيب يبدو مقلوبًا
       * للعميل لأن الثاني يحمل الحالة القديمة.
       */
      const advanced = order.status === 'pending';
      if (advanced) {
        await cx.execute("UPDATE orders SET status = 'confirmed' WHERE id = ?", [orderId]);
      }

      await cx.execute(
        `INSERT INTO order_status_history (order_id, status, note, changed_by)
         VALUES (?, ?, ?, ?)`,
        [orderId, advanced ? 'confirmed' : order.status,
         advanced ? `تأكّد الدفع وبدأ التجهيز — ${note}` : note, reviewerId],
      );

      await cx.execute(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES (?, 'order', 'تأكّد الدفع', ?, ?)`,
        [order.user_id, `استلمنا مبلغ طلبك ${order.order_number} وبدأنا التجهيز.`,
         `/account/orders/${order.order_number}`],
      );

      await cx.execute(
        `INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta)
         VALUES (?, 'payment.confirm', 'order', ?, ?)`,
        [reviewerId, orderId, JSON.stringify({ order_number: order.order_number, note })],
      );

      return { already: false };
    });
  },

  /**
   * معالجة إشعار فوري الوارد.
   * نؤرشف كل استدعاء قبل معالجته: `uq_webhook_event` يمنع المعالجة
   * المكرّرة، ويبقى لدينا أثر كامل عند أي خلاف مع المزوّد.
   */
  async handleFawryNotification(payload) {
    const eventId = String(payload.fawryRefNumber ?? '') + ':' + String(payload.orderStatus ?? '');
    const reference = String(payload.merchantRefNumber ?? payload.merchantRefNum ?? '');
    const signatureOk = verifyNotificationSignature(payload);

    let webhookId;
    try {
      const result = await execute(
        `INSERT INTO payment_webhooks (provider, event_id, reference, signature_ok, payload)
         VALUES ('fawry', ?, ?, ?, ?)`,
        [eventId, reference, signatureOk ? 1 : 0, JSON.stringify(payload)],
      );
      webhookId = result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        logger.info(`إشعار فوري مكرّر تم تجاهله: ${eventId}`);
        return { duplicate: true };
      }
      throw error;
    }

    const fail = async (message) => {
      await execute('UPDATE payment_webhooks SET error = ? WHERE id = ?', [message.slice(0, 255), webhookId]);
      return { processed: false, error: message };
    };

    if (!signatureOk) {
      logger.warn(`إشعار فوري بتوقيع غير صالح للمرجع ${reference}`);
      return fail('توقيع غير صالح');
    }

    const order = await queryOne(
      `SELECT o.id, o.order_number, o.grand_total, o.payment_method, o.payment_status
         FROM orders o WHERE o.order_number = ? LIMIT 1`,
      [reference],
    );
    if (!order) return fail(`لا يوجد طلب بالرقم ${reference}`);
    if (order.payment_method !== 'fawry') return fail('الطلب ليس بوسيلة فوري');

    const status = mapFawryStatus(payload.orderStatus);

    if (status === 'succeeded') {
      // حارس المبلغ: لا نعتمد دفعةً أقلّ من المستحقّ مهما قال المزوّد
      const paid = Number(payload.paymentAmount ?? 0);
      if (Number(paid.toFixed(2)) + 0.01 < Number(order.grand_total)) {
        return fail(`المبلغ المدفوع (${paid}) أقلّ من إجمالي الطلب (${order.grand_total})`);
      }

      await this.markPaid({
        orderId: order.id,
        note: 'تأكيد دفع عبر فوري',
        transactionRef: String(payload.fawryRefNumber ?? ''),
      });
    } else {
      await execute(
        'UPDATE payments SET status = ?, raw_response = ? WHERE order_id = ? ORDER BY id DESC LIMIT 1',
        [status, JSON.stringify(payload), order.id],
      );
      if (status === 'expired' || status === 'failed') {
        await execute("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [order.id]);
      }
    }

    await execute('UPDATE payment_webhooks SET processed = 1 WHERE id = ?', [webhookId]);
    logger.success(`إشعار فوري مُعالَج: ${reference} → ${status}`);
    return { processed: true, status };
  },

  /** إعادة استعلام حالة الدفع من فوري — شبكة أمان إن ضاع الإشعار */
  async refreshFawryStatus(orderNumber, reviewerId) {
    const order = await queryOne(
      'SELECT id, order_number, payment_method, payment_status FROM orders WHERE order_number = ?',
      [orderNumber],
    );
    if (!order) throw ApiError.notFound('الطلب غير موجود');
    if (order.payment_method !== 'fawry') throw ApiError.badRequest('الطلب ليس بوسيلة فوري');

    const { status, raw } = await fawryGateway.fetchStatus(orderNumber);

    if (status === 'succeeded' && order.payment_status !== 'paid') {
      await this.markPaid({
        orderId: order.id,
        reviewerId,
        note: 'تأكيد دفع عبر استعلام فوري اليدوي',
        transactionRef: String(raw?.fawryRefNumber ?? ''),
      });
    } else {
      await execute(
        'UPDATE payments SET status = ?, raw_response = ? WHERE order_id = ? ORDER BY id DESC LIMIT 1',
        [status, JSON.stringify(raw), order.id],
      );
    }

    return { status };
  },

  /**
   * تسجيل تحصيل نقدي عند التسليم.
   * يُستدعى من الفرع لحظة استلام المبلغ، لا قبلها — ولذلك نرفض
   * التسجيل على طلب ملغى أو على وسيلة دفع أخرى.
   */
  async collectCash(orderNumber, collectorId) {
    const order = await queryOne(
      'SELECT id, order_number, status, payment_method, payment_status FROM orders WHERE order_number = ?',
      [orderNumber],
    );
    if (!order) throw ApiError.notFound('الطلب غير موجود');
    if (order.payment_method !== 'cod') {
      throw ApiError.badRequest('هذا الطلب ليس بالدفع عند الاستلام', { code: 'WRONG_METHOD' });
    }
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw ApiError.conflict('لا يمكن تحصيل مبلغ طلب ملغى', { code: 'ORDER_CLOSED' });
    }
    if (order.payment_status === 'paid') {
      throw ApiError.conflict('هذا الطلب محصَّل بالفعل', { code: 'ALREADY_PAID' });
    }

    await this.markPaid({ orderId: order.id, reviewerId: collectorId, note: 'تحصيل نقدي عند التسليم' });
    return { collected: true };
  },

  /** طابور المراجعة في لوحة الإدارة: تحويلات تنتظر قرارًا بشريًا */
  reviewQueue({ branchId } = {}) {
    return query(
      `SELECT o.order_number, o.grand_total, o.placed_at, o.payment_method,
              b.name_ar AS branch_name,
              u.full_name AS customer_name, u.phone AS customer_phone,
              p.id AS payment_id, p.proof_url, p.proof_uploaded_at,
              p.sender_name, p.transaction_ref, p.status AS payment_state
         FROM payments p
         JOIN orders o   ON o.id = p.order_id
         JOIN users u    ON u.id = o.user_id
         JOIN branches b ON b.id = o.branch_id
        WHERE p.status = 'under_review'
          ${branchId ? 'AND o.branch_id = ?' : ''}
        ORDER BY p.proof_uploaded_at ASC`,
      branchId ? [branchId] : [],
    );
  },
};
