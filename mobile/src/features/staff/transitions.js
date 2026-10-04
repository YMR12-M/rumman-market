/**
 * انتقالات حالة الطلب المسموحة — مرآة حرفية لـ ORDER_TRANSITIONS في
 * `server/src/config/constants.js`. الخادم هو الحَكَم (يرفض أي انتقال
 * غير مسموح)، وهذه النسخة لتعرض الواجهة الأزرار الصحيحة فقط فلا يضغط
 * الموظّف زرًّا يعرف الخادم أنه سيرفضه.
 */
export const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** ترتيب الأدوار كما في الخادم (ROLE_RANK) */
export const ROLE_RANK = { customer: 1, staff: 2, branch_manager: 3, admin: 4 };
export const atLeast = (user, role) => (ROLE_RANK[user?.role] ?? 0) >= ROLE_RANK[role];

/** الانتقالات المعروضة لطلب بعينه: لا «في الطريق» لطلب استلام من الفرع */
export function nextStatuses(order) {
  return (ORDER_TRANSITIONS[order.status] ?? [])
    .filter((status) => !(status === 'out_for_delivery' && order.fulfillment_type === 'pickup'));
}

/** انتقالات تحتاج تأكيدًا وسببًا مكتوبًا: لا رجعة فيها ويراها العميل */
export const NEEDS_REASON = new Set(['cancelled', 'refunded']);

/** عنوان زرّ الانتقال — فعلٌ لا اسم حالة */
export const ACTION_LABELS = {
  confirmed: 'تأكيد الطلب',
  preparing: 'بدء التجهيز',
  ready: 'جاهز',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التسليم',
  cancelled: 'إلغاء',
  refunded: 'استرداد',
};
