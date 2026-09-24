/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة لوحة الإدارة
 *
 *  هنا تُبنى بيانات المتجر الحقيقية: الفروع والأقسام والمنتجات
 *  والمخزون والكوبونات. كل كيان يحصل على CRUD من `makeCrud` بقائمة
 *  حقول بيضاء صريحة، ويضاف إليه ما يخصّه وحده من منطق.
 *
 *  المبدأ الذي يحكم الملف: **ما يُحسبه النظام لا يُكتب من اللوحة**.
 *  فلا `rating_avg` ولا `sold_count` ولا `used_count` ولا `reserved`
 *  في أي قائمة بيضاء — هذه أرقام يولّدها البيع، وكتابتها يدويًا
 *  يحوّل التقارير إلى كذب مرتّب.
 * ═══════════════════════════════════════════════════════════════
 */
import crypto from 'node:crypto';
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/security.js';
import { makeCrud, audit, translateDbError } from './admin.repo.js';

/* ═══ الكيانات ════════════════════════════════════════════════════ */

export const branches = makeCrud({
  table: 'branches',
  entity: 'branch',
  label: 'الفرع',
  softDelete: true,
  orderBy: 'name_ar ASC',
  uniqueFields: { uq_branch_code: 'كود الفرع', uq_branch_slug: 'مُعرِّف الفرع' },
  columns: [
    'code', 'slug', 'name_ar', 'name_en', 'tagline_ar', 'address_ar', 'address_en',
    'city', 'governorate', 'latitude', 'longitude', 'phone', 'whatsapp', 'email',
    'opens_at', 'closes_at', 'is_24h', 'delivery_radius_km', 'delivery_fee',
    'free_delivery_over', 'min_order_amount', 'avg_prep_minutes', 'supports_pickup',
    'area_sqm', 'opened_year', 'manager_id', 'status',
  ],
});

export const categories = makeCrud({
  table: 'categories',
  entity: 'category',
  label: 'القسم',
  softDelete: true,
  orderBy: 'sort_order ASC, name_ar ASC',
  uniqueFields: { uq_cat_slug: 'مُعرِّف القسم' },
  columns: [
    'parent_id', 'slug', 'name_ar', 'name_en', 'tagline_ar', 'description_ar',
    'motif', 'accent_color', 'aisle_code', 'sort_order', 'is_featured', 'status',
  ],
});

export const brands = makeCrud({
  table: 'brands',
  entity: 'brand',
  label: 'العلامة التجارية',
  orderBy: 'name_ar ASC',
  uniqueFields: { uq_brand_slug: 'مُعرِّف العلامة' },
  columns: ['slug', 'name_ar', 'name_en', 'country', 'is_house_label', 'status'],
});

export const products = makeCrud({
  table: 'products',
  entity: 'product',
  label: 'المنتج',
  softDelete: true,
  uniqueFields: { uq_product_sku: 'كود المنتج (SKU)', uq_product_slug: 'مُعرِّف المنتج' },
  columns: [
    'sku', 'slug', 'barcode', 'category_id', 'brand_id', 'name_ar', 'name_en',
    'short_desc_ar', 'description_ar', 'unit', 'unit_size', 'price', 'compare_at_price',
    'cost_price', 'tax_rate', 'origin_country', 'farm_or_maker', 'storage_ar',
    'shelf_life_days', 'nutrition', 'allergens', 'tags', 'is_organic', 'is_fresh',
    'is_exclusive', 'is_featured', 'badge', 'max_per_order', 'status',
    // ملاحظة: rating_avg · rating_count · sold_count · view_count غائبة عمدًا
  ],
});

export const coupons = makeCrud({
  table: 'coupons',
  entity: 'coupon',
  label: 'كود الخصم',
  uniqueFields: { uq_coupon_code: 'كود الخصم' },
  columns: [
    'code', 'title_ar', 'type', 'value', 'min_order_amount', 'max_discount',
    'applies_to', 'applies_value', 'first_order_only', 'usage_limit',
    'per_user_limit', 'starts_at', 'ends_at', 'status',
    // used_count غائب عمدًا — يزيد بالاستخدام لا باليد
  ],
});

export const promotions = makeCrud({
  table: 'promotions',
  entity: 'promotion',
  label: 'العرض',
  orderBy: 'sort_order ASC, id DESC',
  uniqueFields: { uq_promo_slug: 'مُعرِّف العرض' },
  columns: [
    'slug', 'title_ar', 'subtitle_ar', 'kind', 'category_id', 'cta_label',
    'cta_href', 'accent', 'starts_at', 'ends_at', 'sort_order', 'status',
  ],
});

export const zones = makeCrud({
  table: 'delivery_zones',
  entity: 'delivery_zone',
  label: 'منطقة التوصيل',
  orderBy: 'name_ar ASC',
  columns: ['branch_id', 'name_ar', 'name_en', 'delivery_fee', 'min_order', 'eta_minutes', 'status'],
});

/* ═══ الفروع: ما يزيد على الـ CRUD ════════════════════════════════ */

export const branchExtras = {
  /** قائمة الفروع مع أرقام تفيد الإدارة فورًا */
  async listWithStats() {
    return query(`
      SELECT b.*,
             m.full_name AS manager_name,
             (SELECT COUNT(*) FROM inventory i WHERE i.branch_id = b.id) AS products_count,
             (SELECT COUNT(*) FROM orders o WHERE o.branch_id = b.id
                AND o.status NOT IN ('cancelled','refunded')) AS orders_count,
             (SELECT COUNT(*) FROM inventory i
               WHERE i.branch_id = b.id AND (i.quantity - i.reserved) <= i.low_stock_threshold) AS low_stock_count
        FROM branches b
        LEFT JOIN users m ON m.id = b.manager_id
       WHERE b.deleted_at IS NULL
       ORDER BY b.name_ar ASC
    `);
  },

  /** مواعيد العمل التفصيلية */
  hours(branchId) {
    return query('SELECT weekday, open_time, close_time, is_closed FROM branch_hours WHERE branch_id = ? ORDER BY weekday', [branchId]);
  },

  /** استبدال كل المواعيد دفعةً واحدة — أبسط وأصحّ من تعديل يوم يوم */
  async replaceHours(branchId, hours, context) {
    await branches.find(branchId);

    await transaction(async (cx) => {
      await cx.execute('DELETE FROM branch_hours WHERE branch_id = ?', [branchId]);
      for (const day of hours) {
        await cx.execute(
          'INSERT INTO branch_hours (branch_id, weekday, open_time, close_time, is_closed) VALUES (?,?,?,?,?)',
          [branchId, day.weekday, day.open_time, day.close_time, day.is_closed ? 1 : 0],
        );
      }
    });

    await audit({ ...context, action: 'branch.hours', entity: 'branch', entityId: branchId, meta: { days: hours.length } });
    return this.hours(branchId);
  },

  zones(branchId) {
    return query('SELECT * FROM delivery_zones WHERE branch_id = ? ORDER BY name_ar', [branchId]);
  },
};

/* ═══ المنتجات: ما يزيد على الـ CRUD ══════════════════════════════ */

export const productExtras = {
  /** قائمة اللوحة: بحث وفلاتر وترقيم، مع إجمالي المخزون عبر الفروع */
  async list({ q, category_id: categoryId, brand_id: brandId, status, limit = 24, offset = 0 }) {
    const where = ['p.deleted_at IS NULL'];
    const params = [];

    if (q) {
      where.push('(p.name_ar LIKE ? OR p.name_en LIKE ? OR p.sku LIKE ? OR p.barcode = ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, q);
    }
    if (categoryId) { where.push('p.category_id = ?'); params.push(categoryId); }
    if (brandId)    { where.push('p.brand_id = ?');    params.push(brandId); }
    if (status)     { where.push('p.status = ?');      params.push(status); }

    const clause = where.join(' AND ');

    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products p WHERE ${clause}`, params);

    const items = await query(`
      SELECT p.id, p.sku, p.slug, p.name_ar, p.name_en, p.price, p.compare_at_price,
             p.unit, p.unit_size, p.status, p.badge, p.is_featured, p.is_organic,
             p.rating_avg, p.rating_count, p.sold_count, p.updated_at,
             c.name_ar AS category_name, c.accent_color AS category_accent,
             br.name_ar AS brand_name,
             COALESCE(SUM(GREATEST(i.quantity - i.reserved, 0)), 0) AS total_available,
             COUNT(DISTINCT i.branch_id) AS branches_count,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id
               ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image_url
        FROM products p
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands br ON br.id = p.brand_id
        LEFT JOIN inventory i ON i.product_id = p.id
       WHERE ${clause}
       GROUP BY p.id
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return { items, total: Number(total) };
  },

  /** منتج واحد بكل ما تحتاجه شاشة التحرير */
  async detail(id) {
    const product = await products.find(id);
    const [images, stock] = await Promise.all([
      query('SELECT id, url, alt_ar, sort_order, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order', [id]),
      query(`
        SELECT i.branch_id, b.name_ar AS branch_name, b.code AS branch_code,
               i.quantity, i.reserved, GREATEST(i.quantity - i.reserved, 0) AS available,
               i.low_stock_threshold, i.aisle, i.price_override, i.restock_at, i.updated_at
          FROM inventory i JOIN branches b ON b.id = i.branch_id
         WHERE i.product_id = ? AND b.deleted_at IS NULL
         ORDER BY b.name_ar
      `, [id]),
    ]);

    return { ...product, images, stock };
  },

  async addImage(productId, { url, altAr, isPrimary }, context) {
    await products.find(productId);

    const inserted = await transaction(async (cx) => {
      if (isPrimary) {
        await cx.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [productId]);
      }
      const [[{ next }]] = await cx.execute(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM product_images WHERE product_id = ?',
        [productId],
      );
      const [result] = await cx.execute(
        'INSERT INTO product_images (product_id, url, alt_ar, sort_order, is_primary) VALUES (?,?,?,?,?)',
        [productId, url, altAr ?? null, next, isPrimary ? 1 : 0],
      );
      return result.insertId;
    });

    await audit({ ...context, action: 'product.image.add', entity: 'product', entityId: productId, meta: { url } });
    return queryOne('SELECT * FROM product_images WHERE id = ?', [inserted]);
  },

  async removeImage(productId, imageId, context) {
    const image = await queryOne('SELECT id FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
    if (!image) throw ApiError.notFound('الصورة غير موجودة');

    await execute('DELETE FROM product_images WHERE id = ?', [imageId]);
    await audit({ ...context, action: 'product.image.remove', entity: 'product', entityId: productId, meta: { imageId } });
    return { deleted: true };
  },

  async setPrimaryImage(productId, imageId, context) {
    const image = await queryOne('SELECT id FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
    if (!image) throw ApiError.notFound('الصورة غير موجودة');

    await transaction(async (cx) => {
      await cx.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [productId]);
      await cx.execute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [imageId]);
    });

    await audit({ ...context, action: 'product.image.primary', entity: 'product', entityId: productId, meta: { imageId } });
    return { updated: true };
  },
};

/* ═══ المخزون ═════════════════════════════════════════════════════ */

export const inventory = {
  /** المخزون في فرع، بحثًا وفرزًا بالأقلّ توفّرًا */
  async byBranch(branchId, { q, lowOnly = false, limit = 50, offset = 0 } = {}) {
    const where = ['i.branch_id = ?', 'p.deleted_at IS NULL'];
    const params = [branchId];

    if (q) {
      where.push('(p.name_ar LIKE ? OR p.sku LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (lowOnly) where.push('(i.quantity - i.reserved) <= i.low_stock_threshold');

    const clause = where.join(' AND ');
    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM inventory i JOIN products p ON p.id = i.product_id WHERE ${clause}`,
      params,
    );

    const items = await query(`
      SELECT i.id, i.product_id, p.name_ar, p.sku, p.unit, p.unit_size, p.price,
             c.name_ar AS category_name, c.accent_color AS category_accent,
             i.quantity, i.reserved, GREATEST(i.quantity - i.reserved, 0) AS available,
             i.low_stock_threshold, i.aisle, i.price_override, i.restock_at, i.updated_at
        FROM inventory i
        JOIN products p ON p.id = i.product_id
        JOIN categories c ON c.id = p.category_id
       WHERE ${clause}
       ORDER BY (i.quantity - i.reserved) ASC, p.name_ar ASC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return { items, total: Number(total) };
  },

  /**
   * ضبط المخزون على قيمة مطلقة (جَرد).
   * نسجّل الفرق كحركة `adjustment` حتى يبقى السجلّ متّسقًا: من نظر
   * إلى تاريخ الصنف يرى دائمًا كيف وصل الرصيد إلى قيمته الحالية.
   */
  async upsert(payload, context) {
    const { branch_id: branchId, product_id: productId } = payload;

    await Promise.all([branches.find(branchId), products.find(productId)]);

    const result = await transaction(async (cx) => {
      const [[existing]] = await cx.execute(
        'SELECT id, quantity FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE',
        [branchId, productId],
      );

      let inventoryId;
      let before = 0;

      if (existing) {
        inventoryId = existing.id;
        before = existing.quantity;
        await cx.execute(
          `UPDATE inventory
              SET quantity = ?, low_stock_threshold = ?, aisle = ?, price_override = ?, restock_at = ?
            WHERE id = ?`,
          [payload.quantity, payload.low_stock_threshold ?? 10, payload.aisle ?? null,
           payload.price_override ?? null, payload.restock_at ?? null, inventoryId],
        );
      } else {
        const [inserted] = await cx.execute(
          `INSERT INTO inventory (branch_id, product_id, quantity, low_stock_threshold, aisle, price_override, restock_at)
           VALUES (?,?,?,?,?,?,?)`,
          [branchId, productId, payload.quantity, payload.low_stock_threshold ?? 10,
           payload.aisle ?? null, payload.price_override ?? null, payload.restock_at ?? null],
        );
        inventoryId = inserted.insertId;
      }

      const delta = payload.quantity - before;
      if (delta !== 0) {
        await cx.execute(
          `INSERT INTO inventory_movements
             (inventory_id, type, quantity, balance_after, reference_type, note, created_by)
           VALUES (?, ?, ?, ?, 'admin', ?, ?)`,
          [inventoryId, existing ? 'adjustment' : 'restock', delta, payload.quantity,
           payload.note ?? (existing ? 'ضبط الرصيد من اللوحة' : 'رصيد ابتدائي'), context.actorId ?? null],
        );
      }

      return inventoryId;
    });

    await audit({
      ...context, action: 'inventory.set', entity: 'inventory', entityId: result,
      meta: { branchId, productId, quantity: payload.quantity },
    });

    return queryOne(`
      SELECT i.*, GREATEST(i.quantity - i.reserved, 0) AS available
        FROM inventory i WHERE i.id = ?`, [result]);
  },

  /** تعديل نسبي (+/-) — للتوريد والهالك والمرتجع */
  async adjust({ branch_id: branchId, product_id: productId, delta, type, note }, context) {
    const updated = await transaction(async (cx) => {
      const [[row]] = await cx.execute(
        'SELECT id, quantity FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE',
        [branchId, productId],
      );
      if (!row) throw ApiError.notFound('هذا المنتج غير مُدرج في مخزون هذا الفرع بعد');

      const after = row.quantity + delta;
      if (after < 0) {
        throw ApiError.badRequest(`الرصيد الحالي ${row.quantity} — لا يمكن خصم ${Math.abs(delta)}`, { code: 'NEGATIVE_STOCK' });
      }

      await cx.execute('UPDATE inventory SET quantity = ? WHERE id = ?', [after, row.id]);
      await cx.execute(
        `INSERT INTO inventory_movements
           (inventory_id, type, quantity, balance_after, reference_type, note, created_by)
         VALUES (?, ?, ?, ?, 'admin', ?, ?)`,
        [row.id, type, delta, after, note ?? null, context.actorId ?? null],
      );

      return { id: row.id, quantity: after };
    });

    await audit({
      ...context, action: 'inventory.adjust', entity: 'inventory', entityId: updated.id,
      meta: { branchId, productId, delta, type },
    });

    return updated;
  },

  /** نشر منتج على عدّة فروع دفعةً واحدة — أسرع خطوة عند إضافة صنف */
  async bulkSet({ product_id: productId, branches: rows }, context) {
    await products.find(productId);
    const applied = [];

    for (const row of rows) {
      const result = await this.upsert({
        branch_id: row.branch_id,
        product_id: productId,
        quantity: row.quantity,
        low_stock_threshold: row.low_stock_threshold ?? 10,
        price_override: row.price_override ?? null,
        aisle: row.aisle ?? null,
        note: 'نشر على الفروع',
      }, context);
      applied.push({ branch_id: row.branch_id, available: result.available });
    }

    return { applied };
  },

  /** سجلّ حركة صنف في فرع — أثر كامل لكل تغيّر */
  movements(branchId, productId, limit = 50) {
    return query(`
      SELECT m.type, m.quantity, m.balance_after, m.reference_type, m.reference_id,
             m.note, m.created_at, u.full_name AS actor_name
        FROM inventory_movements m
        JOIN inventory i ON i.id = m.inventory_id
        LEFT JOIN users u ON u.id = m.created_by
       WHERE i.branch_id = ? AND i.product_id = ?
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ?
    `, [branchId, productId, limit]);
  },
};

/* ═══ المستخدمون والفريق ══════════════════════════════════════════ */

export const users = {
  async list({ q, role, status, limit = 24, offset = 0 }) {
    const where = ['u.deleted_at IS NULL'];
    const params = [];

    if (q) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (role)   { where.push('u.role = ?');   params.push(role); }
    if (status) { where.push('u.status = ?'); params.push(status); }

    const clause = where.join(' AND ');
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users u WHERE ${clause}`, params);

    const items = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status,
             u.loyalty_points, u.loyalty_tier, u.total_spent, u.orders_count,
             u.email_verified_at, u.created_at,
             b.name_ar AS branch_name
        FROM users u
        LEFT JOIN branches b ON b.id = u.default_branch_id
       WHERE ${clause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return { items, total: Number(total) };
  },

  /** إنشاء حساب فريق — لا تسجيل ذاتي للأدوار الإدارية */
  async createStaff(payload, context) {
    const clash = await queryOne('SELECT id FROM users WHERE email = ? OR phone = ?', [payload.email, payload.phone]);
    if (clash) throw ApiError.conflict('البريد أو رقم الهاتف مستخدم بالفعل', { code: 'ACCOUNT_EXISTS' });

    if (payload.default_branch_id) await branches.find(payload.default_branch_id);

    let result;
    try {
      result = await execute(
        `INSERT INTO users (uuid, full_name, email, phone, password_hash, role, default_branch_id, status, email_verified_at)
         VALUES (?,?,?,?,?,?,?, 'active', NOW())`,
        [crypto.randomUUID(), payload.full_name, payload.email, payload.phone,
         await hashPassword(payload.password), payload.role, payload.default_branch_id ?? null],
      );
    } catch (error) {
      throw translateDbError(error, { entityLabel: 'الحساب' });
    }

    await audit({
      ...context, action: 'user.create_staff', entity: 'user', entityId: result.insertId,
      meta: { role: payload.role, email: payload.email },
    });

    return queryOne('SELECT id, full_name, email, phone, role, status, created_at FROM users WHERE id = ?', [result.insertId]);
  },

  /**
   * تعديل حساب.
   * حارسان مهمّان: لا يعدّل أحدٌ حسابه بنفسه من هنا (يمنع رفع
   * الصلاحية الذاتي ويمنع إيقاف نفسك بالخطأ)، ولا يُترك النظام
   * بلا مدير واحد نشط على الأقل.
   */
  async update(userId, payload, context) {
    const user = await queryOne('SELECT id, role, status FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!user) throw ApiError.notFound('الحساب غير موجود');

    if (Number(userId) === Number(context.actorId)) {
      throw ApiError.badRequest('لا يمكن تعديل صلاحيات حسابك أو حالته من هنا', { code: 'SELF_EDIT' });
    }

    const losesAdmin = user.role === 'admin'
      && ((payload.role && payload.role !== 'admin') || payload.status === 'suspended');

    if (losesAdmin) {
      const [{ remaining }] = await query(
        "SELECT COUNT(*) AS remaining FROM users WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL AND id <> ?",
        [userId],
      );
      if (Number(remaining) === 0) {
        throw ApiError.badRequest('هذا آخر مدير نشط — عيّن مديرًا آخر قبل تغييره', { code: 'LAST_ADMIN' });
      }
    }

    if (payload.default_branch_id) await branches.find(payload.default_branch_id);

    const fields = [];
    const values = [];
    for (const key of ['full_name', 'role', 'default_branch_id', 'status']) {
      if (payload[key] !== undefined) { fields.push(`${key} = ?`); values.push(payload[key]); }
    }
    if (fields.length === 0) throw ApiError.badRequest('لا يوجد شيء لتعديله');

    await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, userId]);

    // إيقاف الحساب يُبطل كل جلساته فورًا — وإلّا بقي التوكن صالحًا
    if (payload.status === 'suspended') {
      await execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]);
    }

    await audit({ ...context, action: 'user.update', entity: 'user', entityId: userId, meta: payload });
    return queryOne('SELECT id, full_name, email, phone, role, status, default_branch_id FROM users WHERE id = ?', [userId]);
  },
};

/* ═══ الطلبات في اللوحة ═══════════════════════════════════════════ */

export const orders = {
  async list({ q, branch_id: branchId, status, payment_status: paymentStatus, limit = 24, offset = 0 }) {
    const where = [];
    const params = [];

    if (q) {
      where.push('(o.order_number LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (branchId)      { where.push('o.branch_id = ?');      params.push(branchId); }
    if (status)        { where.push('o.status = ?');         params.push(status); }
    if (paymentStatus) { where.push('o.payment_status = ?'); params.push(paymentStatus); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id ${clause}`,
      params,
    );

    const items = await query(`
      SELECT o.order_number, o.status, o.payment_method, o.payment_status,
             o.fulfillment_type, o.grand_total, o.placed_at, o.delivered_at,
             u.full_name AS customer_name, u.phone AS customer_phone,
             b.name_ar AS branch_name, b.code AS branch_code,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
        FROM orders o
        JOIN users u ON u.id = o.user_id
        JOIN branches b ON b.id = o.branch_id
        ${clause}
       ORDER BY o.placed_at DESC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return { items, total: Number(total) };
  },
};

/* ═══ الإعدادات ═══════════════════════════════════════════════════ */

export const settings = {
  async all() {
    const rows = await query('SELECT `key`, `value`, `group`, updated_at FROM settings ORDER BY `group`, `key`');
    // نجمعها بالمجموعة لتُرسم تبويبات في اللوحة بلا منطق إضافي
    return rows.reduce((groups, row) => {
      (groups[row.group] ??= []).push(row);
      return groups;
    }, {});
  },

  async saveMany(items, context) {
    await transaction(async (cx) => {
      for (const item of items) {
        await cx.execute(
          'INSERT INTO settings (`key`, `value`, `group`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `group` = VALUES(`group`)',
          [item.key, item.value, item.group ?? 'general'],
        );
      }
    });

    await audit({
      ...context, action: 'settings.update', entity: 'settings',
      meta: { keys: items.map((item) => item.key) },
    });

    return this.all();
  },
};

/* ═══ سجلّ التدقيق ════════════════════════════════════════════════ */

export const auditLog = {
  list({ limit = 60, offset = 0, entity: entityFilter } = {}) {
    const where = entityFilter ? 'WHERE a.entity = ?' : '';
    const params = entityFilter ? [entityFilter] : [];
    return query(`
      SELECT a.action, a.entity, a.entity_id, a.meta, a.ip_address, a.created_at,
             u.full_name AS actor_name, u.role AS actor_role
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_id
        ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
  },
};

/* ═══ لوحة الحالة: هل المتجر جاهز للنشر؟ ═════════════════════════ */

/**
 * قائمة تحقّق حيّة تخبر مدير المتجر بما ينقصه ليصير المتجر قابلًا
 * للبيع. هذه الشاشة هي أول ما يراه بعد أول دخول — بديلُنا عن
 * «بيانات العيّنة» التي تُوهم أن كل شيء جاهز.
 */
export async function readiness() {
  const [counts] = await query(`
    SELECT
      (SELECT COUNT(*) FROM branches   WHERE deleted_at IS NULL AND status = 'active')  AS branches,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND status = 'active')  AS categories,
      (SELECT COUNT(*) FROM products   WHERE deleted_at IS NULL AND status = 'active')  AS products,
      (SELECT COUNT(*) FROM inventory  WHERE quantity > 0)                              AS stocked,
      (SELECT COUNT(*) FROM brands     WHERE status = 'active')                         AS brands,
      (SELECT COUNT(*) FROM coupons    WHERE status = 'active')                         AS coupons,
      (SELECT COUNT(*) FROM promotions WHERE status = 'active')                         AS promotions,
      (SELECT COUNT(*) FROM users      WHERE role <> 'customer' AND deleted_at IS NULL) AS staff,
      (SELECT COUNT(*) FROM orders)                                                     AS orders
  `);

  const steps = [
    {
      key: 'branches',
      label: 'أضف فرعًا واحدًا على الأقل',
      note: 'الفرع يحدّد السعر والمخزون ورسوم التوصيل — لا بيع بدونه.',
      done: counts.branches > 0,
      count: counts.branches,
      href: '/admin/branches',
    },
    {
      key: 'categories',
      label: 'أنشئ أقسام المتجر',
      note: 'كل قسم بلونه وزخرفته — منه تُبنى الصفحة الرئيسية.',
      done: counts.categories > 0,
      count: counts.categories,
      href: '/admin/categories',
    },
    {
      key: 'products',
      label: 'أضف منتجات منشورة',
      note: 'المنتج بحالة «مسوّدة» لا يظهر للعملاء.',
      done: counts.products > 0,
      count: counts.products,
      href: '/admin/products',
    },
    {
      key: 'stocked',
      label: 'سجّل المخزون في الفروع',
      note: 'منتج بلا مخزون في فرعٍ لا يمكن إضافته للسلة هناك.',
      done: counts.stocked > 0,
      count: counts.stocked,
      href: '/admin/inventory',
    },
  ];

  return {
    counts,
    steps,
    ready: steps.every((step) => step.done),
    completed: steps.filter((step) => step.done).length,
    total: steps.length,
  };
}
