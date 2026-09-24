/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة المنتجات — قلب الكتالوج
 *
 *  ملاحظتان مهمّتان:
 *  1) كل استعلام منتجات يُربط بفرع (branch_id) لأن السعر والتوفّر
 *     يختلفان من فرع لآخر. إن لم يُمرَّر فرع نعرض سعر الكتالوج العام.
 *  2) قيم الترتيب تأتي من قائمة بيضاء في constants.js — لا نُدخل نصًا
 *     من المستخدم داخل جملة ORDER BY أبدًا.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne, execute } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { PRODUCT_SORTS } from '../../config/constants.js';

/** الحقول المشتركة لبطاقة المنتج في القوائم */
const CARD_FIELDS = `
  p.id, p.sku, p.slug, p.name_ar, p.name_en, p.short_desc_ar,
  p.unit, p.unit_size, p.price, p.compare_at_price, p.badge,
  p.is_organic, p.is_fresh, p.is_exclusive, p.is_featured,
  p.rating_avg, p.rating_count, p.sold_count, p.max_per_order,
  p.origin_country, p.farm_or_maker, p.tags,
  c.slug AS category_slug, c.name_ar AS category_name, c.motif AS category_motif,
  c.accent_color AS category_accent,
  b.slug AS brand_slug, b.name_ar AS brand_name, b.is_house_label
`;

/**
 * جزء الاستعلام الخاص بالفرع.
 * INNER JOIN عند تحديد فرع: لا نعرض منتجًا غير موجود أصلًا في مخزونه.
 */
function branchJoin(branchId, params) {
  if (branchId) {
    params.push(branchId);
    return {
      join: 'JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?',
      priceExpr: 'COALESCE(i.price_override, p.price)',
      stockExpr: 'GREATEST(i.quantity - i.reserved, 0)',
      lowStockExpr: '((i.quantity - i.reserved) <= i.low_stock_threshold)',
      aisleExpr: 'i.aisle',
    };
  }
  return {
    join: '',
    priceExpr: 'p.price',
    stockExpr: '999',
    lowStockExpr: '0',
    aisleExpr: 'NULL',
  };
}

/** تحويل حقول JSON النصيّة القادمة من MySQL إلى كائنات JS */
function hydrate(row) {
  if (!row) return row;
  const parse = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return null; }
  };
  return {
    ...row,
    tags: parse(row.tags) ?? [],
    nutrition: row.nutrition !== undefined ? parse(row.nutrition) : undefined,
    allergens: row.allergens !== undefined ? (parse(row.allergens) ?? []) : undefined,
    in_stock: row.stock === undefined ? true : Number(row.stock) > 0,
    discount_percent: row.compare_at_price
      ? Math.round((1 - Number(row.price) / Number(row.compare_at_price)) * 100)
      : 0,
  };
}

export const productsService = {
  /**
   * قائمة المنتجات مع فلاتر متعدّدة.
   * @param {object} filters
   * @param {number} [filters.branchId]   الفرع المختار
   * @param {string} [filters.category]   slug القسم
   * @param {string} [filters.brand]      slug العلامة
   * @param {string} [filters.search]     نص البحث
   * @param {number} [filters.minPrice]
   * @param {number} [filters.maxPrice]
   * @param {number} [filters.minRating]
   * @param {boolean}[filters.organic]
   * @param {boolean}[filters.onSale]     المخفّضة فقط
   * @param {boolean}[filters.inStock]    المتوفّرة فقط
   * @param {string} [filters.sort]       مفتاح من PRODUCT_SORTS
   */
  async list(filters = {}, { page = 1, limit = 24, offset = 0 } = {}) {
    const params = [];
    const branch = branchJoin(filters.branchId, params);
    const where = ["p.status = 'active'", 'p.deleted_at IS NULL'];

    if (filters.category) { where.push('c.slug = ?'); params.push(filters.category); }
    if (filters.brand)    { where.push('b.slug = ?'); params.push(filters.brand); }

    if (filters.search) {
      // بحث بسيط ومتسامح: يغطي العربية والإنجليزية والوصف والمُنتِج
      where.push('(p.name_ar LIKE ? OR p.name_en LIKE ? OR p.short_desc_ar LIKE ? OR p.farm_or_maker LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    if (filters.minPrice != null) { where.push(`${branch.priceExpr} >= ?`); params.push(filters.minPrice); }
    if (filters.maxPrice != null) { where.push(`${branch.priceExpr} <= ?`); params.push(filters.maxPrice); }
    if (filters.minRating != null) { where.push('p.rating_avg >= ?'); params.push(filters.minRating); }
    if (filters.organic) where.push('p.is_organic = 1');
    if (filters.exclusive) where.push('p.is_exclusive = 1');
    if (filters.featured) where.push('p.is_featured = 1');
    if (filters.onSale) where.push('p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price');
    if (filters.inStock && filters.branchId) where.push('(i.quantity - i.reserved) > 0');

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const orderSql = PRODUCT_SORTS[filters.sort] || PRODUCT_SORTS.featured;

    const baseFrom = `
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      ${branch.join}
      ${whereSql}`;

    // العدّ أولًا (لبناء الترقيم) ثم الصفحة المطلوبة
    const countRow = await queryOne(`SELECT COUNT(*) AS total ${baseFrom}`, params);

    // ملاحظة أمان: limit/offset أرقام صحيحة مُتحقّق منها في getPagination،
    // لذا دمجها نصيًا آمن — وهو ضروري لأن MySQL لا يقبلها كمعاملات هنا بثبات.
    const rows = await query(
      `SELECT ${CARD_FIELDS},
              ${branch.priceExpr} AS effective_price,
              ${branch.stockExpr} AS stock,
              ${branch.lowStockExpr} AS is_low_stock,
              ${branch.aisleExpr} AS aisle
       ${baseFrom}
       ORDER BY ${orderSql}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return {
      items: rows.map(hydrate),
      pagination: { page, limit, total: countRow?.total ?? 0 },
    };
  },

  /** تفاصيل منتج واحد + المخزون في كل الفروع */
  async findBySlug(slug, branchId = null, viewerId = null) {
    const params = [];
    const branch = branchJoin(branchId, params);
    params.push(slug);

    const product = await queryOne(
      `SELECT ${CARD_FIELDS}, p.description_ar, p.barcode, p.nutrition, p.allergens,
              p.storage_ar, p.shelf_life_days, p.tax_rate, p.view_count,
              c.id AS category_id, c.tagline_ar AS category_tagline,
              ${branch.priceExpr} AS effective_price,
              ${branch.stockExpr} AS stock,
              ${branch.lowStockExpr} AS is_low_stock,
              ${branch.aisleExpr} AS aisle
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
         ${branch.join}
        WHERE p.slug = ? AND p.status = 'active' AND p.deleted_at IS NULL`,
      params,
    );

    if (!product) throw ApiError.notFound('المنتج غير موجود');

    // توفّر المنتج في بقية الفروع — ميزة مفيدة عند نفاد الكمية في الفرع الحالي
    const availability = await query(
      `SELECT br.id AS branch_id, br.name_ar, br.slug, br.city,
              GREATEST(i.quantity - i.reserved, 0) AS stock,
              COALESCE(i.price_override, p.price) AS price
         FROM inventory i
         JOIN branches br ON br.id = i.branch_id AND br.status = 'active'
         JOIN products p  ON p.id = i.product_id
        WHERE i.product_id = ?
        ORDER BY stock DESC`,
      [product.id],
    );

    // عدّاد المشاهدات + سجل «شاهدت مؤخرًا» (لا يُعطّل الطلب إن فشل)
    execute('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]).catch(() => {});
    if (viewerId) {
      execute('INSERT INTO product_views (user_id, product_id) VALUES (?, ?)', [viewerId, product.id]).catch(() => {});
    }

    return { ...hydrate(product), availability };
  },

  /** منتجات مشابهة من نفس القسم (باستثناء المنتج نفسه) */
  async related(productId, categoryId, branchId = null, limit = 8) {
    const params = [];
    const branch = branchJoin(branchId, params);
    params.push(categoryId, productId);

    const rows = await query(
      `SELECT ${CARD_FIELDS},
              ${branch.priceExpr} AS effective_price,
              ${branch.stockExpr} AS stock
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
         ${branch.join}
        WHERE p.category_id = ? AND p.id <> ? AND p.status = 'active' AND p.deleted_at IS NULL
        ORDER BY p.sold_count DESC
        LIMIT ${Number(limit)}`,
      params,
    );
    return rows.map(hydrate);
  },

  /**
   * «يُشترى معه عادةً» — توصية مبنيّة على بيانات حقيقية:
   * نبحث عن المنتجات التي ظهرت في نفس الطلبات التي ضمّت هذا المنتج.
   */
  async frequentlyBoughtTogether(productId, limit = 6) {
    const rows = await query(
      `SELECT ${CARD_FIELDS}, p.price AS effective_price, COUNT(*) AS together_count
         FROM order_items oi_self
         JOIN order_items oi_other ON oi_other.order_id = oi_self.order_id
                                  AND oi_other.product_id <> oi_self.product_id
         JOIN products p   ON p.id = oi_other.product_id AND p.status = 'active'
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE oi_self.product_id = ?
        GROUP BY p.id
        ORDER BY together_count DESC
        LIMIT ${Number(limit)}`,
      [productId],
    );
    return rows.map(hydrate);
  },

  /** آخر ما شاهده العميل — بلا تكرار وبترتيب زمني عكسي */
  async recentlyViewed(userId, branchId = null, limit = 10) {
    const params = [];
    const branch = branchJoin(branchId, params);
    params.push(userId);

    const rows = await query(
      `SELECT ${CARD_FIELDS},
              ${branch.priceExpr} AS effective_price,
              ${branch.stockExpr} AS stock,
              MAX(pv.viewed_at) AS last_viewed
         FROM product_views pv
         JOIN products p   ON p.id = pv.product_id AND p.status = 'active'
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
         ${branch.join}
        WHERE pv.user_id = ?
        GROUP BY p.id
        ORDER BY last_viewed DESC
        LIMIT ${Number(limit)}`,
      params,
    );
    return rows.map(hydrate);
  },

  /** اقتراحات البحث السريعة (Autocomplete) */
  async suggest(term, branchId = null, limit = 8) {
    const params = [];
    const branch = branchJoin(branchId, params);
    const like = `%${term}%`;
    params.push(like, like);

    const rows = await query(
      `SELECT p.id, p.slug, p.name_ar, p.unit_size, c.name_ar AS category_name,
              c.motif AS category_motif, c.accent_color AS category_accent,
              ${branch.priceExpr} AS effective_price
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ${branch.join}
        WHERE (p.name_ar LIKE ? OR p.name_en LIKE ?)
          AND p.status = 'active' AND p.deleted_at IS NULL
        ORDER BY p.sold_count DESC
        LIMIT ${Number(limit)}`,
      params,
    );
    return rows;
  },

  /** أكثر الكلمات بحثًا — تُعرض كاقتراحات في شريط البحث الفارغ */
  async trendingSearches(limit = 8) {
    return query(
      `SELECT term, COUNT(*) AS hits
         FROM search_logs
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY term
        ORDER BY hits DESC
        LIMIT ${Number(limit)}`,
    );
  },

  /** تسجيل عملية بحث (للتحليلات واقتراحات «الأكثر بحثًا») */
  async logSearch(term, resultsCount, userId = null) {
    if (!term || term.length < 2) return;
    await execute(
      'INSERT INTO search_logs (user_id, term, results_count) VALUES (?, ?, ?)',
      [userId, term.slice(0, 160), resultsCount],
    ).catch(() => {});
  },
};
