/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة الطلبات — أخطر جزء في النظام
 *
 *  إنشاء الطلب يجري داخل **معاملة واحدة** تشمل:
 *    ١. قفل صفوف المخزون (SELECT ... FOR UPDATE) لمنع البيع الزائد
 *       عند طلب عميلين لآخر قطعة في نفس اللحظة.
 *    ٢. حجز الكميات وتسجيل حركة مخزون لكل صنف.
 *    ٣. إنشاء رأس الطلب وأصنافه ولقطة أسعارها.
 *    ٤. تسجيل استخدام الكوبون وخصم/إضافة نقاط الولاء.
 *    ٥. تفريغ السلة وإنشاء إشعار.
 *  أي فشل في أي خطوة ⇒ ROLLBACK كامل ولا يبقى أثر جزئي.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2 } from '../../utils/money.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS, ORDER_TRANSITIONS, CUSTOMER_CANCELLABLE, LOYALTY_TIERS } from '../../config/constants.js';
import { cartService, computeTotals } from '../cart/cart.service.js';
import { couponsService } from '../coupons/coupons.service.js';
import { branchesService } from '../branches/branches.service.js';
import { paymentsService } from '../payments/payments.service.js';
import { mailer, sendInBackground } from '../../services/mailer/index.js';

/** رقم طلب مقروء للبشر: RMN-<كود الفرع>-<YYMMDD>-<تسلسل اليوم> */
async function generateOrderNumber(connection, branchId) {
  const [[branch]] = await connection.execute('SELECT code FROM branches WHERE id = ?', [branchId]);
  const [[counter]] = await connection.execute(
    'SELECT COUNT(*) + 1 AS seq FROM orders WHERE branch_id = ? AND DATE(placed_at) = CURDATE()',
    [branchId],
  );
  const today = new Date();
  const stamp = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  return `RMN-${branch.code}-${stamp}-${String(counter.seq).padStart(4, '0')}`;
}

/** الفئة المستحقّة بناءً على إجمالي الإنفاق */
function resolveTier(totalSpent) {
  return [...LOYALTY_TIERS].reverse().find((tier) => totalSpent >= tier.minSpent) ?? LOYALTY_TIERS[0];
}

/** تسمية عربية لكل حالة — تظهر في البريد والإشعارات */
const STATUS_LABELS = {
  confirmed:        'تأكّد طلبك',
  preparing:        'جارٍ تجهيز طلبك',
  ready:            'طلبك جاهز',
  out_for_delivery: 'طلبك في الطريق إليك',
  delivered:        'تم تسليم طلبك',
  cancelled:        'أُلغي طلبك',
  refunded:         'تم استرداد قيمة طلبك',
};

const ORDER_FIELDS = `
  o.id, o.order_number, o.status, o.fulfillment_type, o.payment_method, o.payment_status,
  o.subtotal, o.discount_total, o.delivery_fee, o.tax_total, o.points_redeemed,
  o.points_value, o.grand_total, o.points_earned, o.coupon_code,
  o.slot_date, o.slot_from, o.slot_to, o.customer_note, o.cancel_reason,
  o.placed_at, o.delivered_at, o.rating,
  b.name_ar AS branch_name, b.slug AS branch_slug, b.phone AS branch_phone,
  b.address_ar AS branch_address, b.avg_prep_minutes
`;

export const ordersService = {
  /**
   * إنشاء طلب من السلة الحالية.
   * @param {number} userId
   * @param {object} payload بيانات التنفيذ (الفرع، العنوان، الدفع، الموعد، النقاط)
   */
  async create(userId, payload) {
    const {
      branch_id, address_id, fulfillment_type = 'delivery',
      payment_method = 'cod', slot_date, slot_from, slot_to,
      customer_note, use_points = 0,
    } = payload;

    // نفحص الوسيلة أولًا: لا معنى لقفل مخزون لطلب سيُرفض دفعه
    paymentsService.assertMethodEnabled(payment_method);

    const branch = await branchesService.assertOperational(branch_id);
    const snapshot = await cartService.snapshotForCheckout(userId, branch_id);

    // التوصيل يحتاج عنوانًا مملوكًا لنفس العميل
    if (fulfillment_type === 'delivery') {
      const address = await queryOne(
        'SELECT id FROM addresses WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
        [address_id, userId],
      );
      if (!address) throw ApiError.badRequest('اختر عنوان توصيل صحيحًا', { code: 'ADDRESS_REQUIRED' });
    } else if (!branch.supports_pickup) {
      throw ApiError.badRequest('هذا الفرع لا يدعم الاستلام من المتجر');
    }

    const user = await queryOne(
      'SELECT id, full_name, email, phone, loyalty_points, wallet_balance, total_spent FROM users WHERE id = ?',
      [userId],
    );

    // النقاط: لا تتجاوز الرصيد، ولا تغطّي أكثر من 50% من قيمة السلة
    const maxRedeemable = Math.min(
      user.loyalty_points,
      Math.floor((snapshot.totals.subtotal * 0.5) / env.business.pointValueEgp),
    );
    const pointsToRedeem = Math.max(0, Math.min(Number(use_points) || 0, maxRedeemable));
    const pointsValue = round2(pointsToRedeem * env.business.pointValueEgp);

    // إعادة التحقّق من الكوبون لحظة الشراء (قد يكون انتهى بين المعاينة والتأكيد)
    let discount = 0;
    let freeDelivery = false;
    let couponRecord = null;
    if (snapshot.coupon) {
      const validated = await couponsService.validate(snapshot.coupon.code, {
        userId,
        subtotal: snapshot.totals.subtotal,
        deliveryFee: branch.delivery_fee,
        items: snapshot.items,
        isFirstOrder: await cartService.isFirstOrder(userId),
      });
      discount = validated.discount;
      freeDelivery = validated.freeDelivery;
      couponRecord = validated.coupon;
    }

    const totals = computeTotals(
      snapshot.items,
      { ...branch, delivery_fee: fulfillment_type === 'pickup' ? 0 : branch.delivery_fee },
      { discount, freeDelivery: freeDelivery || fulfillment_type === 'pickup', pointsValue },
    );

    if (payment_method === 'wallet' && Number(user.wallet_balance) < totals.grand_total) {
      throw ApiError.badRequest('رصيد المحفظة لا يكفي لإتمام الطلب', { code: 'INSUFFICIENT_WALLET' });
    }

    // النقاط المكتسبة تتضاعف حسب فئة الولاء
    const tier = resolveTier(Number(user.total_spent));
    const pointsEarned = Math.floor(totals.subtotal * env.business.pointsPerEgp * tier.multiplier);

    const order = await transaction(async (cx) => {
      // ── ١) قفل صفوف المخزون والتأكّد من التوفّر ──────────────────
      for (const item of snapshot.items) {
        const [[inventoryRow]] = await cx.execute(
          `SELECT id, quantity, reserved FROM inventory
            WHERE branch_id = ? AND product_id = ? FOR UPDATE`,
          [branch_id, item.product_id],
        );
        if (!inventoryRow) throw ApiError.badRequest(`«${item.name_ar}» غير متاح في هذا الفرع`);

        const available = inventoryRow.quantity - inventoryRow.reserved;
        if (available < item.quantity) {
          throw ApiError.conflict(`نفدت الكمية من «${item.name_ar}» — المتاح ${Math.max(available, 0)}`, { code: 'STOCK_CHANGED' });
        }

        await cx.execute('UPDATE inventory SET reserved = reserved + ? WHERE id = ?', [item.quantity, inventoryRow.id]);
        await cx.execute(
          `INSERT INTO inventory_movements (inventory_id, type, quantity, balance_after, reference_type, note, created_by)
           VALUES (?, 'reserve', ?, ?, 'order', 'حجز عند إنشاء الطلب', ?)`,
          [inventoryRow.id, -item.quantity, inventoryRow.quantity - inventoryRow.reserved - item.quantity, userId],
        );
      }

      // ── ٢) رأس الطلب ───────────────────────────────────────────
      const orderNumber = await generateOrderNumber(cx, branch_id);
      const [orderResult] = await cx.execute(
        `INSERT INTO orders
           (order_number, user_id, branch_id, address_id, fulfillment_type, status,
            payment_method, payment_status, subtotal, discount_total, delivery_fee, tax_total,
            points_redeemed, points_value, grand_total, points_earned, coupon_code,
            slot_date, slot_from, slot_to, customer_note)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber, userId, branch_id,
          fulfillment_type === 'delivery' ? address_id : null,
          fulfillment_type, payment_method,
          paymentsService.initialPaymentStatus(payment_method),
          totals.subtotal, totals.discount_total, totals.delivery_fee, totals.tax_total,
          pointsToRedeem, pointsValue, totals.grand_total, pointsEarned,
          couponRecord?.code ?? null,
          slot_date ?? null, slot_from ?? null, slot_to ?? null, customer_note ?? null,
        ],
      );
      const orderId = orderResult.insertId;

      // ── ٣) أصناف الطلب (لقطة ثابتة لا تتأثر بتغيّر الأسعار لاحقًا) ──
      for (const item of snapshot.items) {
        await cx.execute(
          `INSERT INTO order_items
             (order_id, product_id, name_snapshot, unit_snapshot, sku_snapshot, unit_price, quantity, line_total)
           VALUES (?, ?, ?, ?, (SELECT sku FROM products WHERE id = ?), ?, ?, ?)`,
          [orderId, item.product_id, item.name_ar, item.unit_size, item.product_id,
           item.unit_price, item.quantity, round2(item.unit_price * item.quantity)],
        );
        await cx.execute('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      await cx.execute(
        `INSERT INTO order_status_history (order_id, status, note, changed_by)
         VALUES (?, 'pending', 'تم استلام الطلب', ?)`,
        [orderId, userId],
      );

      // ── ٤) الكوبون والنقاط والمحفظة ────────────────────────────
      if (couponRecord) {
        await cx.execute(
          'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
          [couponRecord.id, userId, orderId, totals.discount_total],
        );
        await cx.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponRecord.id]);
      }

      if (pointsToRedeem > 0) {
        const balanceAfter = user.loyalty_points - pointsToRedeem;
        await cx.execute('UPDATE users SET loyalty_points = ? WHERE id = ?', [balanceAfter, userId]);
        await cx.execute(
          `INSERT INTO loyalty_transactions (user_id, order_id, type, points, balance_after, note)
           VALUES (?, ?, 'redeem', ?, ?, ?)`,
          [userId, orderId, -pointsToRedeem, balanceAfter, `استبدال في الطلب ${orderNumber}`],
        );
      }

      if (payment_method === 'wallet') {
        const balanceAfter = round2(Number(user.wallet_balance) - totals.grand_total);
        await cx.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [balanceAfter, userId]);
        await cx.execute(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, reference)
           VALUES (?, 'debit', ?, ?, 'دفع طلب', ?)`,
          [userId, totals.grand_total, balanceAfter, orderNumber],
        );
        await cx.execute(
          `INSERT INTO payments (order_id, provider, amount, status, transaction_ref)
           VALUES (?, 'wallet', ?, 'succeeded', ?)`,
          [orderId, totals.grand_total, `WLT-${orderNumber}`],
        );
      } else {
        await cx.execute(
          'INSERT INTO payments (order_id, provider, amount, status) VALUES (?, ?, ?, ?)',
          [orderId, payment_method, totals.grand_total, paymentsService.initialPaymentRecordStatus(payment_method)],
        );
      }

      // ── ٥) تفريغ السلة + إشعار العميل ──────────────────────────
      await cx.execute('DELETE FROM cart_items WHERE cart_id = ?', [snapshot.cart_id]);
      await cx.execute("UPDATE carts SET status = 'converted', coupon_code = NULL WHERE id = ?", [snapshot.cart_id]);
      await cx.execute("INSERT INTO carts (user_id, branch_id, status) VALUES (?, ?, 'active')", [userId, branch_id]);

      const notice = payment_method === 'cod' || payment_method === 'wallet'
        ? `طلبك ${orderNumber} قيد المراجعة وسنبدأ التجهيز فورًا.`
        : `طلبك ${orderNumber} محجوز — أكمِل الدفع ليبدأ التجهيز.`;

      await cx.execute(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES (?, 'order', 'استلمنا طلبك', ?, ?)`,
        [userId, notice, `/account/orders/${orderNumber}`],
      );

      return this.findByNumber(orderNumber, userId, cx);
    });

    /**
     * ما بعد المعاملة — عمدًا خارجها.
     * نداء بوّابة الدفع قد يستغرق ثوانيَ، وإبقاء المعاملة مفتوحة طوالها
     * يقفل صفوف المخزون أمام بقيّة العملاء. الطلب صار حقيقةً مثبَّتة،
     * وما يفشل هنا يُعالَج بلا إلغائه.
     */
    let paymentInstructions = null;
    let paymentError = null;
    try {
      paymentInstructions = await paymentsService.prepare({
        order,
        customer: user,
        items: order.items ?? [],
      });
    } catch (error) {
      // الطلب باقٍ والمخزون محجوز — العميل يغيّر وسيلة الدفع من صفحة الطلب
      paymentError = error.message;
      logger.warn(`تعذّر تجهيز الدفع للطلب ${order.order_number}: ${error.message}`);
    }

    sendInBackground(() => mailer.sendOrderPlaced({
      to: user.email,
      name: user.full_name,
      order,
      items: order.items ?? [],
    }));

    return { ...order, payment_instructions: paymentInstructions, payment_error: paymentError };
  },

  /** قائمة طلبات العميل مع ملخّص أصنافها */
  async listForUser(userId, { status, page = 1, limit = 10, offset = 0 } = {}) {
    const params = [userId];
    let where = 'WHERE o.user_id = ?';
    if (status) { where += ' AND o.status = ?'; params.push(status); }

    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    const orders = await query(
      `SELECT ${ORDER_FIELDS},
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o
         JOIN branches b ON b.id = o.branch_id
         ${where}
         ORDER BY o.placed_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    // نرفق أول ثلاثة أصناف لعرض معاينة سريعة في بطاقة الطلب
    for (const order of orders) {
      order.preview_items = await query(
        'SELECT name_snapshot, quantity FROM order_items WHERE order_id = ? LIMIT 3',
        [order.id],
      );
    }

    return { items: orders, pagination: { page, limit, total: countRow.total } };
  },

  /** تفاصيل طلب واحد — يتحقّق من ملكيته للعميل ما لم يكن من الفريق */
  async findByNumber(orderNumber, userId = null, connection = null) {
    const run = connection
      ? async (sql, params) => { const [rows] = await connection.execute(sql, params); return rows; }
      : query;

    const [order] = await run(
      `SELECT ${ORDER_FIELDS}, o.user_id, o.branch_id, o.address_id,
              u.full_name AS customer_name, u.phone AS customer_phone
         FROM orders o
         JOIN branches b ON b.id = o.branch_id
         JOIN users u ON u.id = o.user_id
        WHERE o.order_number = ?`,
      [orderNumber],
    );
    if (!order) throw ApiError.notFound('الطلب غير موجود');
    if (userId && order.user_id !== userId) throw ApiError.forbidden('هذا الطلب لا يخصّك');

    const [items, timeline, address, payment] = await Promise.all([
      run(`SELECT oi.*, p.slug, c.motif AS category_motif, c.accent_color AS category_accent
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             LEFT JOIN categories c ON c.id = p.category_id
            WHERE oi.order_id = ?`, [order.id]),
      run('SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [order.id]),
      order.address_id ? run('SELECT * FROM addresses WHERE id = ?', [order.address_id]) : Promise.resolve([]),
      run(`SELECT provider, amount, status, transaction_ref, fawry_reference, expires_at,
                  proof_url, proof_uploaded_at, sender_name, review_note, reviewed_at, created_at
             FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1`, [order.id]),
    ]);

    return {
      ...order,
      items,
      timeline,
      address: address[0] ?? null,
      payment: payment[0] ?? null,
      can_cancel: CUSTOMER_CANCELLABLE.includes(order.status),
      can_reorder: ['delivered', 'cancelled'].includes(order.status),
    };
  },

  /**
   * تغيير حالة الطلب عبر آلة الحالة.
   * عند "delivered" نحوّل الحجز إلى بيع فعلي ونمنح نقاط الولاء.
   * وعند "cancelled" نُعيد الكميات المحجوزة والنقاط المستبدلة.
   */
  async updateStatus(orderNumber, nextStatus, { actorId, note } = {}) {
    const order = await queryOne('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
    if (!order) throw ApiError.notFound('الطلب غير موجود');

    const allowed = ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw ApiError.badRequest(`لا يمكن الانتقال من «${order.status}» إلى «${nextStatus}»`, { code: 'INVALID_TRANSITION' });
    }

    await transaction(async (cx) => {
      await cx.execute(
        'UPDATE orders SET status = ?, delivered_at = IF(? = ?, NOW(), delivered_at) WHERE id = ?',
        [nextStatus, nextStatus, ORDER_STATUS.DELIVERED, order.id],
      );
      await cx.execute(
        'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
        [order.id, nextStatus, note ?? null, actorId ?? null],
      );

      const items = await cx.execute('SELECT product_id, quantity, name_snapshot FROM order_items WHERE order_id = ?', [order.id])
        .then(([rows]) => rows);

      if (nextStatus === ORDER_STATUS.DELIVERED) {
        // الحجز يتحوّل إلى خصم فعلي من الرف
        for (const item of items) {
          const [[inv]] = await cx.execute('SELECT id, quantity, reserved FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE', [order.branch_id, item.product_id]);
          if (!inv) continue;
          await cx.execute('UPDATE inventory SET quantity = quantity - ?, reserved = GREATEST(reserved - ?, 0) WHERE id = ?', [item.quantity, item.quantity, inv.id]);
          await cx.execute(
            `INSERT INTO inventory_movements (inventory_id, type, quantity, balance_after, reference_type, reference_id, note)
             VALUES (?, 'sale', ?, ?, 'order', ?, 'بيع مؤكّد عند التسليم')`,
            [inv.id, -item.quantity, inv.quantity - item.quantity, order.id],
          );
        }

        // منح النقاط وتحديث إجمالي الإنفاق والفئة
        const [[user]] = await cx.execute('SELECT loyalty_points, total_spent, orders_count FROM users WHERE id = ? FOR UPDATE', [order.user_id]);
        const newPoints = user.loyalty_points + order.points_earned;
        const newSpent = round2(Number(user.total_spent) + Number(order.grand_total));
        const newTier = resolveTier(newSpent);

        await cx.execute(
          'UPDATE users SET loyalty_points = ?, total_spent = ?, orders_count = ?, loyalty_tier = ? WHERE id = ?',
          [newPoints, newSpent, user.orders_count + 1, newTier.key, order.user_id],
        );
        await cx.execute(
          `INSERT INTO loyalty_transactions (user_id, order_id, type, points, balance_after, note)
           VALUES (?, ?, 'earn', ?, ?, ?)`,
          [order.user_id, order.id, order.points_earned, newPoints, `نقاط الطلب ${order.order_number}`],
        );
        /**
         * الكاش يُحصَّل لحظة التسليم. لا نلمس إنستاباي ولا فوري هنا:
         * تلك لها مسار اعتماد مستقلّ في paymentsService.markPaid، وقد
         * تكون مدفوعة مسبقًا — فتحديثها من هنا يزيّف تاريخ التحصيل.
         */
        if (order.payment_method === 'cod' && order.payment_status !== 'paid') {
          await cx.execute("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [order.id]);
          await cx.execute(
            "UPDATE payments SET status = 'succeeded', reviewed_by = ?, reviewed_at = NOW(), review_note = 'تحصيل نقدي عند التسليم' WHERE order_id = ? ORDER BY id DESC LIMIT 1",
            [actorId ?? null, order.id],
          );
        }
        await cx.execute(
          `INSERT INTO notifications (user_id, type, title, body, link)
           VALUES (?, 'order', 'تم تسليم طلبك', ?, ?)`,
          [order.user_id, `أضفنا ${order.points_earned} نقطة إلى رصيدك. بالهناء والشفاء.`, `/account/orders/${order.order_number}`],
        );
      }

      if (nextStatus === ORDER_STATUS.CANCELLED) {
        // فكّ الحجز وإعادة ما استُبدل من نقاط ورصيد محفظة
        for (const item of items) {
          const [[inv]] = await cx.execute('SELECT id, quantity, reserved FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE', [order.branch_id, item.product_id]);
          if (!inv) continue;
          await cx.execute('UPDATE inventory SET reserved = GREATEST(reserved - ?, 0) WHERE id = ?', [item.quantity, inv.id]);
          await cx.execute(
            `INSERT INTO inventory_movements (inventory_id, type, quantity, balance_after, reference_type, reference_id, note)
             VALUES (?, 'release', ?, ?, 'order', ?, 'فكّ الحجز بعد الإلغاء')`,
            [inv.id, item.quantity, inv.quantity - inv.reserved + item.quantity, order.id],
          );
          await cx.execute('UPDATE products SET sold_count = GREATEST(sold_count - ?, 0) WHERE id = ?', [item.quantity, item.product_id]);
        }

        if (order.points_redeemed > 0) {
          const [[user]] = await cx.execute('SELECT loyalty_points FROM users WHERE id = ? FOR UPDATE', [order.user_id]);
          const restored = user.loyalty_points + order.points_redeemed;
          await cx.execute('UPDATE users SET loyalty_points = ? WHERE id = ?', [restored, order.user_id]);
          await cx.execute(
            `INSERT INTO loyalty_transactions (user_id, order_id, type, points, balance_after, note)
             VALUES (?, ?, 'adjust', ?, ?, 'إعادة نقاط بعد إلغاء الطلب')`,
            [order.user_id, order.id, order.points_redeemed, restored],
          );
        }

        if (order.payment_method === 'wallet' && order.payment_status === 'paid') {
          const [[user]] = await cx.execute('SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [order.user_id]);
          const balanceAfter = round2(Number(user.wallet_balance) + Number(order.grand_total));
          await cx.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [balanceAfter, order.user_id]);
          await cx.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, reference)
             VALUES (?, 'credit', ?, ?, 'استرداد طلب ملغي', ?)`,
            [order.user_id, order.grand_total, balanceAfter, order.order_number],
          );
          await cx.execute("UPDATE orders SET payment_status = 'refunded' WHERE id = ?", [order.id]);
        }

        if (order.coupon_code) {
          await cx.execute('UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?', [order.coupon_code]);
        }

        await cx.execute(
          `INSERT INTO notifications (user_id, type, title, body, link)
           VALUES (?, 'order', 'أُلغي طلبك', ?, ?)`,
          [order.user_id, `أُلغي الطلب ${order.order_number}. إن كان هناك مبلغ مدفوع فقد أُعيد إلى محفظتك.`, `/account/orders/${order.order_number}`],
        );
      }
    });

    const fresh = await this.findByNumber(orderNumber);

    // إشعار بالبريد بكل انتقال يهمّ العميل — لا ينتظره الردّ
    if (STATUS_LABELS[nextStatus]) {
      const customer = await queryOne('SELECT full_name, email FROM users WHERE id = ?', [order.user_id]);
      if (customer?.email) {
        sendInBackground(() => mailer.sendOrderStatus({
          to: customer.email,
          name: customer.full_name,
          order: fresh,
          statusLabel: STATUS_LABELS[nextStatus],
          statusNote: note,
        }));
      }
    }

    return fresh;
  },

  /** إلغاء العميل لطلبه (مسموح في المراحل المبكرة فقط) */
  async cancelByCustomer(orderNumber, userId, reason) {
    const order = await queryOne('SELECT status, user_id FROM orders WHERE order_number = ?', [orderNumber]);
    if (!order) throw ApiError.notFound('الطلب غير موجود');
    if (order.user_id !== userId) throw ApiError.forbidden('هذا الطلب لا يخصّك');
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw ApiError.badRequest('بدأ تجهيز الطلب — تواصل مع خدمة العملاء للإلغاء', { code: 'TOO_LATE_TO_CANCEL' });
    }

    await execute('UPDATE orders SET cancel_reason = ? WHERE order_number = ?', [reason ?? 'إلغاء من العميل', orderNumber]);
    return this.updateStatus(orderNumber, ORDER_STATUS.CANCELLED, { actorId: userId, note: reason });
  },

  /** إعادة الطلب: نضيف ما زال متاحًا إلى السلة ونُبلغ بما تعذّر */
  async reorder(orderNumber, userId) {
    const order = await this.findByNumber(orderNumber, userId);
    const skipped = [];

    for (const item of order.items) {
      if (!item.product_id) { skipped.push(item.name_snapshot); continue; }
      try {
        await cartService.addItem(userId, order.branch_id, { product_id: item.product_id, quantity: item.quantity });
      } catch {
        skipped.push(item.name_snapshot);
      }
    }

    return { cart: await cartService.getCart(userId, order.branch_id), skipped };
  },

  /** تقييم تجربة التوصيل بعد التسليم */
  async rate(orderNumber, userId, rating) {
    const order = await queryOne('SELECT id, user_id, status FROM orders WHERE order_number = ?', [orderNumber]);
    if (!order || order.user_id !== userId) throw ApiError.notFound('الطلب غير موجود');
    if (order.status !== ORDER_STATUS.DELIVERED) throw ApiError.badRequest('يمكن التقييم بعد التسليم فقط');
    await execute('UPDATE orders SET rating = ? WHERE id = ?', [rating, order.id]);
    return { rated: true };
  },

  /** مواعيد التوصيل المتاحة لفرع في تاريخ معيّن */
  async availableSlots(branchId, date) {
    const { DELIVERY_SLOTS } = await import('../../config/constants.js');
    const now = new Date();
    const target = new Date(`${date}T00:00:00`);
    const isToday = target.toDateString() === now.toDateString();

    // نقيس ضغط كل شريحة بعدد الطلبات المحجوزة عليها
    const booked = await query(
      "SELECT slot_from, COUNT(*) AS total FROM orders WHERE branch_id = ? AND slot_date = ? AND status NOT IN ('cancelled') GROUP BY slot_from",
      [branchId, date],
    );
    const bookedMap = new Map(booked.map((row) => [String(row.slot_from).slice(0, 5), row.total]));
    const CAPACITY = 25;

    return DELIVERY_SLOTS.map((slot) => {
      const used = bookedMap.get(slot.from) ?? 0;
      const [hour] = slot.from.split(':').map(Number);
      const passed = isToday && now.getHours() >= hour - 1; // نغلق الشريحة قبل ساعة من بدايتها
      return {
        ...slot,
        date,
        capacity: CAPACITY,
        remaining: Math.max(CAPACITY - used, 0),
        available: !passed && used < CAPACITY,
        reason: passed ? 'انتهى وقت الحجز لهذه الشريحة' : used >= CAPACITY ? 'الشريحة مكتملة' : null,
      };
    });
  },
};
