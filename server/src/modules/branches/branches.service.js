/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة الفروع
 *  الفرع هو محور التجربة كلها في رُمّان: الأسعار والمخزون والتوصيل
 *  تُحسب دائمًا بالنسبة لفرع محدّد، لا للمتجر ككل.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { haversineKm } from '../../utils/geo.js';

const BRANCH_FIELDS = `
  b.id, b.code, b.slug, b.name_ar, b.name_en, b.tagline_ar,
  b.address_ar, b.address_en, b.city, b.governorate,
  b.latitude, b.longitude, b.phone, b.whatsapp, b.email,
  b.opens_at, b.closes_at, b.is_24h, b.delivery_radius_km,
  b.delivery_fee, b.free_delivery_over, b.min_order_amount,
  b.avg_prep_minutes, b.supports_pickup, b.area_sqm, b.opened_year, b.status
`;

/**
 * هل الفرع مفتوح الآن؟ نحسبها في التطبيق لا في SQL حتى نتعامل
 * بوضوح مع الفروع التي تغلق بعد منتصف الليل (مثل 08:00 ← 01:00).
 */
function isOpenNow(branch, now = new Date()) {
  if (branch.is_24h) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const open = toMinutes(branch.opens_at);
  const close = toMinutes(branch.closes_at);
  // يمتد بعد منتصف الليل
  return close <= open ? minutes >= open || minutes < close : minutes >= open && minutes < close;
}

/** إثراء صف الفرع ببيانات محسوبة تحتاجها الواجهة مباشرة */
const decorate = (branch, origin) => ({
  ...branch,
  is_open_now: isOpenNow(branch),
  distance_km: origin ? haversineKm(origin.lat, origin.lng, branch.latitude, branch.longitude) : null,
});

export const branchesService = {
  /** كل الفروع النشطة، مرتّبة بالأقرب إن أرسل العميل موقعه */
  async list({ lat, lng, city } = {}) {
    const params = [];
    let sql = `SELECT ${BRANCH_FIELDS},
                      (SELECT COUNT(*) FROM inventory i WHERE i.branch_id = b.id AND i.quantity > 0) AS available_products
                 FROM branches b
                WHERE b.deleted_at IS NULL AND b.status <> 'closed'`;

    if (city) {
      sql += ' AND (b.city LIKE ? OR b.governorate LIKE ?)';
      params.push(`%${city}%`, `%${city}%`);
    }
    sql += ' ORDER BY b.id ASC';

    const rows = await query(sql, params);
    const origin = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;
    const branches = rows.map((row) => decorate(row, origin));

    if (origin) branches.sort((a, b) => a.distance_km - b.distance_km);
    return branches;
  },

  /** فرع واحد عبر slug أو id، مع مواعيده ومناطق توصيله */
  async findOne(identifier) {
    const isNumeric = /^\d+$/.test(String(identifier));
    const branch = await queryOne(
      `SELECT ${BRANCH_FIELDS} FROM branches b
        WHERE ${isNumeric ? 'b.id = ?' : 'b.slug = ?'} AND b.deleted_at IS NULL`,
      [identifier],
    );
    if (!branch) throw ApiError.notFound('الفرع غير موجود');

    const [hours, zones, stats] = await Promise.all([
      query('SELECT weekday, open_time, close_time, is_closed FROM branch_hours WHERE branch_id = ? ORDER BY weekday', [branch.id]),
      query("SELECT id, name_ar, name_en, delivery_fee, min_order, eta_minutes FROM delivery_zones WHERE branch_id = ? AND status = 'active'", [branch.id]),
      queryOne(
        `SELECT COUNT(DISTINCT i.product_id) AS products_count,
                SUM(CASE WHEN (i.quantity - i.reserved) <= i.low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count
           FROM inventory i WHERE i.branch_id = ?`,
        [branch.id],
      ),
    ]);

    return { ...decorate(branch), hours, delivery_zones: zones, stats };
  },

  /** أقرب فرع لإحداثيات العميل — يُستخدم في الاختيار التلقائي عند أول زيارة */
  async nearest(lat, lng) {
    const branches = await this.list({ lat, lng });
    if (branches.length === 0) throw ApiError.notFound('لا توجد فروع متاحة');

    const nearest = branches[0];
    return {
      ...nearest,
      within_delivery_range: nearest.distance_km <= Number(nearest.delivery_radius_km),
    };
  },

  /** التأكد من وجود الفرع وصلاحيته لاستقبال الطلبات */
  async assertOperational(branchId) {
    const branch = await queryOne(
      `SELECT ${BRANCH_FIELDS} FROM branches b WHERE b.id = ? AND b.deleted_at IS NULL`,
      [branchId],
    );
    if (!branch) throw ApiError.notFound('الفرع غير موجود');
    if (branch.status !== 'active') throw ApiError.badRequest('هذا الفرع لا يستقبل طلبات حاليًا');
    return branch;
  },
};
