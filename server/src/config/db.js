/**
 * تجمّع اتصالات MySQL (Connection Pool) + مساعدات الاستعلام.
 *
 * لماذا Pool وليس اتصالًا واحدًا؟
 * لأن كل طلب HTTP يستعير اتصالًا ثم يعيده، فنتجنّب كلفة فتح اتصال جديد
 * ونحمي قاعدة البيانات من الإغراق بعدد اتصالات غير محدود.
 *
 * ملاحظة أمان: كل الاستعلامات هنا مُعامَلة (parameterized) — لا نبني SQL
 * بدمج نصوص من المستخدم إطلاقًا.
 */
import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  dateStrings: ['DATE'],
  // نحوّل DECIMAL إلى Number لتسهيل الحسابات في طبقة التطبيق
  decimalNumbers: true,
});

/** استعلام يعيد مصفوفة صفوف */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** استعلام يعيد أول صف فقط أو null */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/** تنفيذ INSERT/UPDATE/DELETE ويعيد معلومات النتيجة (insertId، affectedRows) */
export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

/**
 * تشغيل مجموعة عمليات داخل معاملة (Transaction).
 * يُمرَّر الاتصال إلى الدالة، ويُعمل COMMIT تلقائيًا عند النجاح
 * و ROLLBACK عند أي خطأ — ثم يُعاد الاتصال للـ pool في كل الأحوال.
 *
 * @example
 *   await transaction(async (cx) => {
 *     await cx.execute('UPDATE ...');
 *     await cx.execute('INSERT ...');
 *   });
 */
export async function transaction(handler) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** فحص الاتصال عند الإقلاع — نفضّل الفشل المبكر الواضح */
export async function assertDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.success(`قاعدة البيانات متصلة: ${env.db.database}@${env.db.host}:${env.db.port}`);
    return true;
  } catch (error) {
    logger.error(`تعذّر الاتصال بقاعدة البيانات: ${error.message}`);
    return false;
  }
}
