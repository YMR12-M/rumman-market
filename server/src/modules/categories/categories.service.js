/**
 * خدمة الأقسام — شجرة الأقسام وعدد المنتجات المتاحة في كل قسم
 * بالنسبة للفرع المختار (وليس إجمالي الكتالوج).
 */
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const CATEGORY_FIELDS = `
  c.id, c.parent_id, c.slug, c.name_ar, c.name_en, c.tagline_ar,
  c.description_ar, c.motif, c.accent_color, c.aisle_code,
  c.sort_order, c.is_featured
`;

export const categoriesService = {
  /**
   * قائمة الأقسام مع عدّاد منتجات لكل قسم.
   * إن مُرّر branchId يُحسب العدّاد من مخزون الفرع فقط — وهذا هو
   * السلوك الصحيح: لا نعرض للعميل قسمًا فارغًا في فرعه.
   */
  async list({ branchId = null, featuredOnly = false } = {}) {
    const params = [];
    let countExpr = `(SELECT COUNT(*) FROM products p
                       WHERE p.category_id = c.id AND p.status = 'active' AND p.deleted_at IS NULL)`;

    if (branchId) {
      countExpr = `(SELECT COUNT(*) FROM products p
                      JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
                     WHERE p.category_id = c.id AND p.status = 'active'
                       AND p.deleted_at IS NULL AND (i.quantity - i.reserved) > 0)`;
      params.push(branchId);
    }

    let sql = `SELECT ${CATEGORY_FIELDS}, ${countExpr} AS products_count
                 FROM categories c
                WHERE c.status = 'active' AND c.deleted_at IS NULL`;
    if (featuredOnly) sql += ' AND c.is_featured = 1';
    sql += ' ORDER BY c.sort_order ASC, c.id ASC';

    return query(sql, params);
  },

  /** قسم واحد مع أقسامه الفرعية إن وُجدت */
  async findOne(slug, branchId = null) {
    const category = await queryOne(
      `SELECT ${CATEGORY_FIELDS} FROM categories c
        WHERE c.slug = ? AND c.status = 'active' AND c.deleted_at IS NULL`,
      [slug],
    );
    if (!category) throw ApiError.notFound('القسم غير موجود');

    const children = await query(
      `SELECT ${CATEGORY_FIELDS} FROM categories c WHERE c.parent_id = ? AND c.status = 'active' ORDER BY c.sort_order`,
      [category.id],
    );

    // نطاق الأسعار داخل القسم — تحتاجه الواجهة لضبط فلتر السعر
    const priceRange = await queryOne(
      `SELECT MIN(COALESCE(i.price_override, p.price)) AS min_price,
              MAX(COALESCE(i.price_override, p.price)) AS max_price
         FROM products p
         ${branchId ? 'JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?' : 'LEFT JOIN inventory i ON 1 = 0'}
        WHERE p.category_id = ? AND p.status = 'active' AND p.deleted_at IS NULL`,
      branchId ? [branchId, category.id] : [category.id],
    );

    return { ...category, children, price_range: priceRange };
  },
};
