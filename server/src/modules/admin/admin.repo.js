/**
 * ═══════════════════════════════════════════════════════════════
 *  مصنع عمليات CRUD المشتركة
 *
 *  لوحة الإدارة تدير تسعة كيانات بنفس المنطق تقريبًا: قائمة، عنصر،
 *  إنشاء، تعديل، حذف، وسجلّ تدقيق. كتابة ذلك تسع مرّات يعني تسع
 *  فرص لنسيان سجلّ التدقيق أو للسماح بحقل لم نقصده.
 *
 *  فبدل ذلك: مصنع واحد يبني العمليات من وصفٍ مصرَّح به.
 *
 *  ⚠ حصن الأمان هنا: `columns` قائمة بيضاء صريحة. أي حقل يرسله
 *  العميل وليس في القائمة يُهمَل بصمت — فلا يمكن لأحد تعديل
 *  `rating_avg` أو `sold_count` أو `used_count` عبر نموذج التعديل،
 *  ولا يمكن حقن اسم عمود في الـ SQL لأن الأسماء لا تأتي من المدخلات.
 * ═══════════════════════════════════════════════════════════════
 */
import { query, queryOne, execute } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

/** الحقول التي تُخزَّن JSON — نسلسلها قبل الكتابة */
const jsonColumns = new Set(['nutrition', 'allergens', 'tags', 'meta']);

/** تحويل قيمة JS إلى ما يقبله عمود MySQL */
function toColumnValue(column, value) {
  if (value === undefined) return undefined;
  if (jsonColumns.has(column)) return value === null ? null : JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/**
 * يبني جملة SET من قائمة بيضاء.
 * @returns {{clause: string, values: any[]}}
 */
function buildSet(payload, columns) {
  const parts = [];
  const values = [];

  for (const column of columns) {
    const value = toColumnValue(column, payload[column]);
    if (value === undefined) continue;
    parts.push(`\`${column}\` = ?`);
    values.push(value);
  }

  if (parts.length === 0) throw ApiError.badRequest('لا يوجد شيء لتعديله');
  return { clause: parts.join(', '), values };
}

/**
 * يترجم أخطاء MySQL المتوقّعة إلى رسائل عربية مفهومة.
 * بدون هذا يرى مدير المتجر «ER_DUP_ENTRY» ولا يعرف أي حقل تكرّر.
 */
export function translateDbError(error, { uniqueFields = {}, entityLabel = 'العنصر' } = {}) {
  if (error?.code === 'ER_DUP_ENTRY') {
    // رسالة MySQL تحمل اسم الفهرس: Duplicate entry 'x' for key 'uq_product_sku'
    const keyMatch = /for key '(?:[^.]+\.)?([^']+)'/.exec(error.message);
    const indexName = keyMatch?.[1];
    const field = uniqueFields[indexName];
    return ApiError.conflict(
      field ? `${field} مستخدم بالفعل — اختر قيمة أخرى` : `${entityLabel} موجود بالفعل بنفس البيانات`,
      { code: 'DUPLICATE', details: field ? { [indexName]: field } : null },
    );
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.code === 'ER_ROW_IS_REFERENCED') {
    return ApiError.conflict(
      `لا يمكن حذف ${entityLabel} لأن عناصر أخرى مرتبطة به. عطّله بدلًا من حذفه.`,
      { code: 'IN_USE' },
    );
  }

  if (error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_NO_REFERENCED_ROW') {
    return ApiError.badRequest('أحد الاختيارات يشير إلى عنصر غير موجود', { code: 'BAD_REFERENCE' });
  }

  if (error?.code === 'ER_DATA_TOO_LONG') {
    return ApiError.badRequest('إحدى القيم أطول من المسموح', { code: 'TOO_LONG' });
  }

  return error;
}

/** سجلّ تدقيق لكل عملية كتابة في اللوحة — من فعل، وماذا، ومتى */
export async function audit({ actorId, action, entity, entityId, meta = null, ip = null }) {
  await execute(
    'INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta, ip_address) VALUES (?,?,?,?,?,?)',
    [actorId ?? null, action, entity, entityId ?? null, meta ? JSON.stringify(meta) : null, ip],
  );
}

/**
 * يبني مجموعة عمليات CRUD لكيان واحد.
 *
 * @param {object} config
 * @param {string} config.table        اسم الجدول
 * @param {string} config.entity       اسم الكيان في سجلّ التدقيق
 * @param {string} config.label        اسمه العربي في رسائل الخطأ
 * @param {string[]} config.columns    القائمة البيضاء للحقول القابلة للكتابة
 * @param {boolean} [config.softDelete] هل الجدول يحمل deleted_at؟
 * @param {string} [config.orderBy]    ترتيب القائمة الافتراضي
 * @param {string} [config.selectList] أعمدة القائمة (افتراضيًا *)
 * @param {Record<string,string>} [config.uniqueFields] فهرس ← اسم الحقل العربي
 */
export function makeCrud(config) {
  const {
    table, entity, label, columns,
    softDelete = false,
    orderBy = 'id DESC',
    selectList = '*',
    uniqueFields = {},
  } = config;

  const aliveClause = softDelete ? 'deleted_at IS NULL' : '1 = 1';
  const fail = (error) => { throw translateDbError(error, { uniqueFields, entityLabel: label }); };

  return {
    table,
    entity,
    label,

    async list({ where = [], params = [], order = orderBy } = {}) {
      const clauses = [aliveClause, ...where].join(' AND ');
      return query(`SELECT ${selectList} FROM \`${table}\` WHERE ${clauses} ORDER BY ${order}`, params);
    },

    async find(id) {
      const row = await queryOne(`SELECT * FROM \`${table}\` WHERE id = ? AND ${aliveClause}`, [id]);
      if (!row) throw ApiError.notFound(`${label} غير موجود`);
      return row;
    },

    async create(payload, context = {}) {
      const present = columns.filter((column) => payload[column] !== undefined);
      if (present.length === 0) throw ApiError.badRequest('لا توجد بيانات للإنشاء');

      const placeholders = present.map(() => '?').join(', ');
      const fields = present.map((column) => `\`${column}\``).join(', ');
      const values = present.map((column) => toColumnValue(column, payload[column]));

      let result;
      try {
        result = await execute(`INSERT INTO \`${table}\` (${fields}) VALUES (${placeholders})`, values);
      } catch (error) { fail(error); }

      await audit({
        actorId: context.actorId, action: `${entity}.create`,
        entity, entityId: result.insertId, ip: context.ip,
        meta: { fields: present },
      });

      return this.find(result.insertId);
    },

    async update(id, payload, context = {}) {
      await this.find(id); // يرمي 404 قبل أي كتابة

      const { clause, values } = buildSet(payload, columns);
      try {
        await execute(`UPDATE \`${table}\` SET ${clause} WHERE id = ?`, [...values, id]);
      } catch (error) { fail(error); }

      await audit({
        actorId: context.actorId, action: `${entity}.update`,
        entity, entityId: id, ip: context.ip,
        meta: { fields: Object.keys(payload).filter((key) => columns.includes(key)) },
      });

      return this.find(id);
    },

    /**
     * الحذف.
     * مع softDelete نُعلّم `deleted_at` فقط — لأن حذف منتج بيع فعلًا
     * يكسر تاريخ الطلبات. وبدونه نحذف فعليًا ونترجم خطأ الارتباط.
     */
    async remove(id, context = {}) {
      await this.find(id);

      try {
        if (softDelete) {
          await execute(`UPDATE \`${table}\` SET deleted_at = NOW() WHERE id = ?`, [id]);
        } else {
          await execute(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
        }
      } catch (error) { fail(error); }

      await audit({
        actorId: context.actorId, action: `${entity}.delete`,
        entity, entityId: id, ip: context.ip,
        meta: { soft: softDelete },
      });

      return { deleted: true, soft: softDelete };
    },

    /** استرجاع عنصر محذوف منطقيًا */
    async restore(id, context = {}) {
      if (!softDelete) throw ApiError.badRequest('هذا الكيان لا يدعم الاسترجاع');

      const row = await queryOne(`SELECT id FROM \`${table}\` WHERE id = ?`, [id]);
      if (!row) throw ApiError.notFound(`${label} غير موجود`);

      await execute(`UPDATE \`${table}\` SET deleted_at = NULL WHERE id = ?`, [id]);
      await audit({ actorId: context.actorId, action: `${entity}.restore`, entity, entityId: id, ip: context.ip });
      return this.find(id);
    },

    /** إعادة ترتيب دفعةً واحدة (الأقسام والعروض) */
    async reorder(order, context = {}) {
      for (const { id, sort_order: sortOrder } of order) {
        await execute(`UPDATE \`${table}\` SET sort_order = ? WHERE id = ?`, [sortOrder, id]);
      }
      await audit({
        actorId: context.actorId, action: `${entity}.reorder`, entity,
        ip: context.ip, meta: { count: order.length },
      });
      return { reordered: order.length };
    },
  };
}
