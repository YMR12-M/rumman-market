/**
 * ═══════════════════════════════════════════════════════════════
 *  بوّابة فوري — FawryPay (تكامل فعلي)
 *
 *  النموذج المستخدم: PAYATFAWRY — نطلب من فوري كودَ دفع، ونعطيه
 *  للعميل ليدفع من أي منفذ فوري أو تطبيق myFawry. حين يدفع، تستدعي
 *  فوري نقطة الـ webhook عندنا فنعتمد الطلب.
 *
 *  لماذا لا نفعل ذلك بالبطاقة؟ لأن البطاقة تتطلّب تمرير بيانات
 *  حسّاسة عبر خادمنا أو استضافة إطار دفع — وكلاهما التزام PCI
 *  لا يُفتح إلا بقرار واعٍ. كود الدفع يعطي التحصيل الفوري بلا ذلك.
 *
 *  التوقيع: فوري توقّع كل طلب واستجابة بـ SHA-256 على سلسلة
 *  مرتَّبة ترتيبًا محدّدًا في وثائقهم. أي اختلاف في الترتيب أو
 *  في تنسيق الأرقام يُنتج توقيعًا مرفوضًا — لذلك كل سلسلة هنا
 *  موثّقة بترتيبها.
 * ═══════════════════════════════════════════════════════════════
 */
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

const { merchantCode, securityKey, baseUrl, expiryHours } = env.payments.fawry;

const sha256Hex = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

/** فوري تطلب المبالغ بمنزلتين عشريتين دائمًا — "150" تُرفض، "150.00" تُقبل */
const amount2 = (value) => Number(value).toFixed(2);

/**
 * توقيع طلب إنشاء عملية الدفع.
 * الترتيب حسب وثائق فوري:
 *   merchantCode + merchantRefNum + customerProfileId + paymentMethod
 *   + amount + [itemId + quantity + price] لكل صنف مرتّبًا + secureKey
 */
function signCharge({ merchantRefNum, customerProfileId, paymentMethod, total, items }) {
  const itemsPart = items
    .map((item) => `${item.itemId}${item.quantity}${amount2(item.price)}`)
    .join('');

  return sha256Hex(
    merchantCode + merchantRefNum + (customerProfileId ?? '') + paymentMethod
    + amount2(total) + itemsPart + securityKey,
  );
}

/**
 * التحقّق من توقيع إشعار الدفع الوارد.
 * الترتيب حسب وثائق فوري:
 *   fawryRefNumber + merchantRefNum + paymentAmount + orderAmount
 *   + orderStatus + paymentMethod + paymentRefrenceNumber + secureKey
 *
 *  (نعم، `paymentRefrenceNumber` مكتوبة هكذا في واجهتهم — لا تصحّحها.)
 */
export function verifyNotificationSignature(payload) {
  const expected = sha256Hex(
    String(payload.fawryRefNumber ?? '')
    + String(payload.merchantRefNumber ?? payload.merchantRefNum ?? '')
    + amount2(payload.paymentAmount ?? 0)
    + amount2(payload.orderAmount ?? 0)
    + String(payload.orderStatus ?? '')
    + String(payload.paymentMethod ?? '')
    + String(payload.paymentRefrenceNumber ?? '')
    + securityKey,
  );

  const received = String(payload.messageSignature ?? '');
  if (expected.length !== received.length) return false;

  // مقارنة ثابتة الزمن — تمنع استنتاج التوقيع عبر قياس زمن الرفض
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

/** تحويل حالة فوري إلى حالة الدفع عندنا */
export function mapFawryStatus(orderStatus) {
  switch (String(orderStatus).toUpperCase()) {
    case 'PAID':      return 'succeeded';
    case 'NEW':
    case 'UNPAID':    return 'pending';
    case 'EXPIRED':   return 'expired';
    case 'REFUNDED':  return 'refunded';
    case 'CANCELED':
    case 'CANCELLED':
    case 'FAILED':    return 'failed';
    default:          return 'pending';
  }
}

export const fawryGateway = {
  get enabled() {
    return env.payments.fawry.enabled;
  },

  /**
   * إنشاء كود دفع لطلب.
   * @param {object} order  رأس الطلب (order_number, grand_total)
   * @param {object} customer  { id, full_name, email, phone }
   * @param {Array}  items  أصناف الطلب
   * @returns {Promise<{referenceNumber:string, expiresAt:Date, raw:object}>}
   */
  async createCharge({ order, customer, items }) {
    if (!this.enabled) throw ApiError.badRequest('الدفع عبر فوري غير مفعّل حاليًا', { code: 'FAWRY_DISABLED' });

    /**
     * مجموع الأصناف يجب أن يساوي المبلغ المُوقَّع تمامًا، وإلا رفضت
     * فوري العملية. الخصومات ورسوم التوصيل تُمرَّر كأصناف مستقلّة
     * بدل تعديل أسعار المنتجات — فيبقى الإيصال مفهومًا للعميل.
     */
    const lines = items.map((item) => ({
      itemId: String(item.sku_snapshot || item.product_id || item.id),
      description: String(item.name_snapshot).slice(0, 50),
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
    }));

    if (Number(order.delivery_fee) > 0) {
      lines.push({ itemId: 'DELIVERY', description: 'رسوم التوصيل', price: Number(order.delivery_fee), quantity: 1 });
    }

    const linesTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const difference = Number((Number(order.grand_total) - linesTotal).toFixed(2));
    if (difference !== 0) {
      // فرقٌ سالب = خصم، موجب = ضريبة أو تقريب. نمرّره صنفًا صريحًا.
      lines.push({
        itemId: difference < 0 ? 'DISCOUNT' : 'ADJUSTMENT',
        description: difference < 0 ? 'خصم' : 'فروق',
        price: difference,
        quantity: 1,
      });
    }

    const body = {
      merchantCode,
      merchantRefNum: order.order_number,
      customerProfileId: String(customer.id),
      customerName: customer.full_name,
      customerMobile: customer.phone,
      customerEmail: customer.email,
      paymentMethod: 'PAYATFAWRY',
      amount: amount2(order.grand_total),
      currencyCode: 'EGP',
      description: `طلب ${order.order_number}`,
      paymentExpiry: Date.now() + expiryHours * 3600 * 1000,
      chargeItems: lines.map((line) => ({ ...line, price: amount2(line.price) })),
      signature: signCharge({
        merchantRefNum: order.order_number,
        customerProfileId: String(customer.id),
        paymentMethod: 'PAYATFAWRY',
        total: order.grand_total,
        items: lines,
      }),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/ECommerceWeb/Fawry/payments/charge`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.statusCode !== 200) {
        logger.error(`فوري رفضت الطلب ${order.order_number}: ${data.statusDescription || response.status}`);
        throw ApiError.badGateway(
          data.statusDescription || 'تعذّر إنشاء كود الدفع لدى فوري — جرّب وسيلة دفع أخرى',
          { code: 'FAWRY_CHARGE_FAILED' },
        );
      }

      return {
        referenceNumber: String(data.referenceNumber),
        expiresAt: new Date(Date.now() + expiryHours * 3600 * 1000),
        raw: data,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const reason = error.name === 'AbortError' ? 'انتهت مهلة الاتصال بفوري' : error.message;
      logger.error(`تعذّر الاتصال بفوري للطلب ${order.order_number}: ${reason}`);
      throw ApiError.badGateway('تعذّر الاتصال ببوّابة فوري — جرّب وسيلة دفع أخرى', { code: 'FAWRY_UNREACHABLE' });
    } finally {
      clearTimeout(timeout);
    }
  },

  /**
   * استعلام عن حالة عملية — شبكة أمان إن ضاع إشعار الـ webhook.
   * تستدعيها لوحة الإدارة بزرّ «تحديث حالة الدفع».
   */
  async fetchStatus(orderNumber) {
    if (!this.enabled) throw ApiError.badRequest('الدفع عبر فوري غير مفعّل حاليًا', { code: 'FAWRY_DISABLED' });

    const signature = sha256Hex(merchantCode + orderNumber + securityKey);
    const url = `${baseUrl.replace(/\/$/, '')}/ECommerceWeb/Fawry/payments/status/v2`
      + `?merchantCode=${encodeURIComponent(merchantCode)}`
      + `&merchantRefNumber=${encodeURIComponent(orderNumber)}`
      + `&signature=${signature}`;

    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.statusCode !== 200) {
      throw ApiError.badGateway(data.statusDescription || 'تعذّر الاستعلام من فوري', { code: 'FAWRY_STATUS_FAILED' });
    }

    return { status: mapFawryStatus(data.orderStatus), raw: data };
  },
};
