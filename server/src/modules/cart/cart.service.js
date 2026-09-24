/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة السلة
 *
 *  قرار معماري: السلة تُحفظ في قاعدة البيانات لا في المتصفّح.
 *  السبب: العميل يفتح من الموبايل ثم من اللابتوب ويجد سلته كما تركها،
 *  ونستطيع قياس السلات المتروكة (Abandoned Carts) لاحقًا.
 *
 *  لكل (عميل × فرع) سلة مستقلّة — لأن الأسعار والتوفّر يختلفان بالفرع.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2, sum, percentOf } from '../../utils/money.js';
import { branchesService } from '../branches/branches.service.js';
import { couponsService } from '../coupons/coupons.service.js';

/** إيجاد سلة العميل النشطة في هذا الفرع أو إنشاؤها */
async function getOrCreateCart(userId, branchId) {
  const existing = await queryOne(
    "SELECT * FROM carts WHERE user_id = ? AND branch_id = ? AND status = 'active' LIMIT 1",
    [userId, branchId],
  );
  if (existing) return existing;

  const result = await execute(
    "INSERT INTO carts (user_id, branch_id, status) VALUES (?, ?, 'active')",
    [userId, branchId],
  );
  return { id: result.insertId, user_id: userId, branch_id: branchId, coupon_code: null };
}

/** قراءة أصناف السلة مع أسعار ومخزون الفرع اللحظيين */
async function readItems(cartId, branchId) {
  return query(
    `SELECT ci.id AS cart_item_id, ci.quantity, ci.note,
            p.id AS product_id, p.slug, p.name_ar, p.unit, p.unit_size,
            p.max_per_order, p.compare_at_price, p.tax_rate,
            c.id AS category_id, c.name_ar AS category_name,
            c.motif AS category_motif, c.accent_color AS category_accent,
            COALESCE(i.price_override, p.price) AS unit_price,
            GREATEST(COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0), 0) AS stock
       FROM cart_items ci
       JOIN products p   ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
      WHERE ci.cart_id = ?
      ORDER BY ci.created_at DESC`,
    [branchId, cartId],
  );
}

/**
 * حساب إجماليات السلة في مكان واحد.
 * تُستدعى من السلة ومن إنشاء الطلب معًا — ضمانًا لعدم اختلاف الأرقام.
 */
function computeTotals(items, branch, { discount = 0, freeDelivery = false, pointsValue = 0 } = {}) {
  const subtotal = sum(items.map((it) => Number(it.unit_price) * it.quantity));

  // التوصيل مجاني إذا تجاوز المجموع حدّ الفرع أو بكوبون شحن مجاني
  const qualifiesFree = subtotal >= Number(branch.free_delivery_over);
  const deliveryFee = freeDelivery || qualifiesFree ? 0 : round2(branch.delivery_fee);

  const taxTotal = round2(
    items.reduce((acc, it) => acc + percentOf(Number(it.unit_price) * it.quantity, Number(it.tax_rate || 0)), 0),
  );

  const grandTotal = Math.max(0, round2(subtotal - discount - pointsValue + deliveryFee + taxTotal));

  return {
    subtotal,
    discount_total: round2(discount),
    points_value: round2(pointsValue),
    delivery_fee: deliveryFee,
    tax_total: taxTotal,
    grand_total: grandTotal,
    free_delivery_applied: deliveryFee === 0,
    amount_to_free_delivery: qualifiesFree ? 0 : round2(Number(branch.free_delivery_over) - subtotal),
    meets_minimum: subtotal >= Number(branch.min_order_amount),
    minimum_required: round2(branch.min_order_amount),
  };
}

/** تنبيهات لكل صنف: نفد / الكمية أكبر من المتاح / تجاوز الحد الأقصى */
function annotateIssues(items) {
  return items.map((item) => {
    const issues = [];
    if (item.stock <= 0) issues.push({ type: 'out_of_stock', message: 'نفد من هذا الفرع' });
    else if (item.quantity > item.stock) issues.push({ type: 'insufficient', message: `المتاح ${item.stock} فقط` });
    if (item.quantity > item.max_per_order) issues.push({ type: 'max_per_order', message: `الحد الأقصى ${item.max_per_order} للطلب` });
    return { ...item, line_total: round2(Number(item.unit_price) * item.quantity), issues };
  });
}

export const cartService = {
  /** الحالة الكاملة للسلة: أصناف + إجماليات + تنبيهات */
  async getCart(userId, branchId) {
    const branch = await branchesService.assertOperational(branchId);
    const cart = await getOrCreateCart(userId, branchId);
    const items = annotateIssues(await readItems(cart.id, branchId));

    let discount = 0;
    let freeDelivery = false;
    let coupon = null;

    // إن كان هناك كوبون محفوظ نعيد التحقّق منه في كل قراءة —
    // فقد تتغيّر السلة ويصبح الكوبون غير مؤهّل.
    if (cart.coupon_code) {
      try {
        const subtotal = sum(items.map((it) => Number(it.unit_price) * it.quantity));
        const result = await couponsService.validate(cart.coupon_code, {
          userId, subtotal, deliveryFee: branch.delivery_fee, items,
          isFirstOrder: await this.isFirstOrder(userId),
        });
        discount = result.discount;
        freeDelivery = result.freeDelivery;
        coupon = result.coupon;
      } catch {
        await execute('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cart.id]);
      }
    }

    return {
      cart_id: cart.id,
      branch: { id: branch.id, name_ar: branch.name_ar, slug: branch.slug, delivery_fee: branch.delivery_fee },
      items,
      items_count: items.reduce((acc, it) => acc + it.quantity, 0),
      coupon,
      totals: computeTotals(items, branch, { discount, freeDelivery }),
      has_issues: items.some((it) => it.issues.length > 0),
    };
  },

  /** إضافة صنف — إن كان موجودًا نزيد كميته بدل تكراره */
  async addItem(userId, branchId, { product_id, quantity = 1, note = null }) {
    await branchesService.assertOperational(branchId);

    const product = await queryOne(
      `SELECT p.id, p.name_ar, p.max_per_order, p.status,
              COALESCE(i.price_override, p.price) AS unit_price,
              GREATEST(COALESCE(i.quantity,0) - COALESCE(i.reserved,0), 0) AS stock
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
        WHERE p.id = ? AND p.deleted_at IS NULL`,
      [branchId, product_id],
    );

    if (!product || product.status !== 'active') throw ApiError.notFound('المنتج غير متاح');
    if (product.stock <= 0) throw ApiError.badRequest(`«${product.name_ar}» نفد من هذا الفرع`, { code: 'OUT_OF_STOCK' });

    const cart = await getOrCreateCart(userId, branchId);
    const existing = await queryOne('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, product_id]);
    const desired = (existing?.quantity ?? 0) + quantity;

    if (desired > product.stock) {
      throw ApiError.badRequest(`المتاح من «${product.name_ar}» هو ${product.stock} فقط`, { code: 'INSUFFICIENT_STOCK' });
    }
    if (desired > product.max_per_order) {
      throw ApiError.badRequest(`الحد الأقصى ${product.max_per_order} من «${product.name_ar}» في الطلب الواحد`, { code: 'MAX_PER_ORDER' });
    }

    if (existing) {
      await execute('UPDATE cart_items SET quantity = ?, note = COALESCE(?, note) WHERE id = ?', [desired, note, existing.id]);
    } else {
      await execute(
        'INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?)',
        [cart.id, product_id, quantity, product.unit_price, note],
      );
    }

    return this.getCart(userId, branchId);
  },

  /** تعديل كمية صنف — الكمية صفر تعني حذفه */
  async updateItem(userId, branchId, productId, quantity) {
    const cart = await getOrCreateCart(userId, branchId);
    if (quantity <= 0) return this.removeItem(userId, branchId, productId);

    const product = await queryOne(
      `SELECT p.name_ar, p.max_per_order,
              GREATEST(COALESCE(i.quantity,0) - COALESCE(i.reserved,0), 0) AS stock
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
        WHERE p.id = ?`,
      [branchId, productId],
    );
    if (!product) throw ApiError.notFound('المنتج غير موجود');
    if (quantity > product.stock) throw ApiError.badRequest(`المتاح ${product.stock} فقط`, { code: 'INSUFFICIENT_STOCK' });
    if (quantity > product.max_per_order) throw ApiError.badRequest(`الحد الأقصى ${product.max_per_order}`, { code: 'MAX_PER_ORDER' });

    const result = await execute('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?', [quantity, cart.id, productId]);
    if (result.affectedRows === 0) throw ApiError.notFound('الصنف غير موجود في سلتك');

    return this.getCart(userId, branchId);
  },

  async removeItem(userId, branchId, productId) {
    const cart = await getOrCreateCart(userId, branchId);
    await execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    return this.getCart(userId, branchId);
  },

  async clear(userId, branchId) {
    const cart = await getOrCreateCart(userId, branchId);
    await transaction(async (cx) => {
      await cx.execute('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      await cx.execute('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cart.id]);
    });
    return this.getCart(userId, branchId);
  },

  /** تطبيق كوبون بعد التحقّق الكامل منه */
  async applyCoupon(userId, branchId, code) {
    const snapshot = await this.getCart(userId, branchId);
    if (snapshot.items.length === 0) throw ApiError.badRequest('سلتك فارغة');

    const branch = await branchesService.assertOperational(branchId);
    await couponsService.validate(code, {
      userId,
      subtotal: snapshot.totals.subtotal,
      deliveryFee: branch.delivery_fee,
      items: snapshot.items,
      isFirstOrder: await this.isFirstOrder(userId),
    });

    await execute('UPDATE carts SET coupon_code = ? WHERE id = ?', [String(code).trim().toUpperCase(), snapshot.cart_id]);
    return this.getCart(userId, branchId);
  },

  async removeCoupon(userId, branchId) {
    const cart = await getOrCreateCart(userId, branchId);
    await execute('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cart.id]);
    return this.getCart(userId, branchId);
  },

  /**
   * دمج سلة الزائر (المحفوظة في المتصفّح) بعد تسجيل الدخول.
   * نتجاهل الأصناف غير المتاحة بهدوء بدل إفشال العملية كلها.
   */
  async merge(userId, branchId, guestItems = []) {
    for (const item of guestItems) {
      try {
        await this.addItem(userId, branchId, { product_id: item.product_id, quantity: item.quantity });
      } catch {
        // صنف نفد أو تجاوز الحد — نتخطّاه ونكمل
      }
    }
    return this.getCart(userId, branchId);
  },

  /** هل هذا أول طلب للعميل؟ (شرط بعض الكوبونات) */
  async isFirstOrder(userId) {
    const row = await queryOne(
      "SELECT COUNT(*) AS total FROM orders WHERE user_id = ? AND status <> 'cancelled'",
      [userId],
    );
    return (row?.total ?? 0) === 0;
  },

  /** تُستخدم من خدمة الطلبات: قراءة السلة جاهزة للتحويل إلى طلب */
  async snapshotForCheckout(userId, branchId) {
    const snapshot = await this.getCart(userId, branchId);
    if (snapshot.items.length === 0) throw ApiError.badRequest('سلتك فارغة');
    if (snapshot.has_issues) throw ApiError.badRequest('راجع سلتك — بعض الأصناف لم تعد متاحة بالكمية المطلوبة', { code: 'CART_ISSUES' });
    if (!snapshot.totals.meets_minimum) {
      throw ApiError.badRequest(`الحد الأدنى للطلب ${snapshot.totals.minimum_required} ج.م`, { code: 'BELOW_MINIMUM' });
    }
    return snapshot;
  },
};

export { computeTotals };
