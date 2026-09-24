/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة الكوبونات
 *  مكان واحد يحسب الخصم ويتحقّق من كل الشروط، تستدعيه السلة عند
 *  المعاينة والطلب عند التأكيد — فلا يختلف الرقمان أبدًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2, percentOf } from '../../utils/money.js';

export const couponsService = {
  /** الكوبونات المتاحة للعرض على العميل (بلا الأكواد الخاصة المنتهية) */
  async listActive() {
    return query(
      `SELECT code, title_ar, type, value, min_order_amount, max_discount, ends_at
         FROM coupons
        WHERE status = 'active' AND starts_at <= NOW() AND ends_at >= NOW()
          AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY value DESC`,
    );
  },

  /**
   * التحقّق من كوبون وحساب قيمة خصمه.
   *
   * @param {string} code كود الكوبون
   * @param {object} ctx
   * @param {number} ctx.userId
   * @param {number} ctx.subtotal مجموع السلة قبل الخصم
   * @param {number} ctx.deliveryFee رسوم التوصيل (لكوبونات الشحن المجاني)
   * @param {Array}  ctx.items أصناف السلة (لكوبونات قسم/منتج بعينه)
   * @param {boolean} ctx.isFirstOrder
   * @returns {{coupon: object, discount: number, freeDelivery: boolean}}
   */
  async validate(code, { userId, subtotal, deliveryFee = 0, items = [], isFirstOrder = false }) {
    const coupon = await queryOne(
      'SELECT * FROM coupons WHERE code = ? LIMIT 1',
      [String(code).trim().toUpperCase()],
    );

    if (!coupon) throw ApiError.badRequest('كود الخصم غير صحيح', { code: 'COUPON_NOT_FOUND' });
    if (coupon.status !== 'active') throw ApiError.badRequest('هذا الكود غير مفعّل حاليًا', { code: 'COUPON_INACTIVE' });

    const now = new Date();
    if (new Date(coupon.starts_at) > now) throw ApiError.badRequest('لم يبدأ هذا العرض بعد', { code: 'COUPON_NOT_STARTED' });
    if (new Date(coupon.ends_at) < now) throw ApiError.badRequest('انتهت صلاحية هذا الكود', { code: 'COUPON_EXPIRED' });

    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
      throw ApiError.badRequest('استُنفد هذا العرض بالكامل', { code: 'COUPON_EXHAUSTED' });
    }

    if (subtotal < Number(coupon.min_order_amount)) {
      throw ApiError.badRequest(
        `الحد الأدنى لاستخدام هذا الكود ${Number(coupon.min_order_amount).toLocaleString('ar-EG')} ج.م`,
        { code: 'COUPON_MIN_ORDER' },
      );
    }

    if (coupon.first_order_only && !isFirstOrder) {
      throw ApiError.badRequest('هذا الكود مخصّص للطلب الأول فقط', { code: 'COUPON_FIRST_ONLY' });
    }

    if (userId) {
      const usage = await queryOne(
        'SELECT COUNT(*) AS times FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?',
        [coupon.id, userId],
      );
      if (usage.times >= coupon.per_user_limit) {
        throw ApiError.badRequest('استخدمت هذا الكود من قبل', { code: 'COUPON_USER_LIMIT' });
      }
    }

    // المبلغ الذي يُطبَّق عليه الخصم: كل السلة أو أصناف قسم/منتج محدّد
    let eligibleAmount = subtotal;
    if (coupon.applies_to === 'category') {
      eligibleAmount = round2(
        items.filter((it) => Number(it.category_id) === Number(coupon.applies_value))
             .reduce((acc, it) => acc + it.unit_price * it.quantity, 0),
      );
    } else if (coupon.applies_to === 'product') {
      eligibleAmount = round2(
        items.filter((it) => Number(it.product_id) === Number(coupon.applies_value))
             .reduce((acc, it) => acc + it.unit_price * it.quantity, 0),
      );
    }

    if (eligibleAmount <= 0) {
      throw ApiError.badRequest('لا توجد أصناف مؤهّلة لهذا الكود في سلتك', { code: 'COUPON_NO_ELIGIBLE' });
    }

    let discount = 0;
    let freeDelivery = false;

    switch (coupon.type) {
      case 'percentage':
        discount = percentOf(eligibleAmount, coupon.value);
        if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
        break;
      case 'fixed':
        discount = Math.min(Number(coupon.value), eligibleAmount);
        break;
      case 'free_delivery':
        freeDelivery = true;
        discount = round2(deliveryFee);
        break;
      default:
        discount = 0;
    }

    return {
      coupon: { id: coupon.id, code: coupon.code, title_ar: coupon.title_ar, type: coupon.type, value: coupon.value },
      discount: round2(discount),
      freeDelivery,
    };
  },
};
