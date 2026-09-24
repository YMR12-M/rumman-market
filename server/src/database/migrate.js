/**
 * ═══════════════════════════════════════════════════════════════
 *  تهيئة قاعدة البيانات
 *  ينشئ القاعدة إن لم تكن موجودة ثم ينفّذ database/schema.sql.
 *
 *  ملاحظة تقنية: كلمة DELIMITER أمر خاص بعميل mysql السطري وليست
 *  جملة SQL، لذا نفصل كتلة المحفّزات (Triggers) ونشغّلها جملةً جملة.
 *
 *  التشغيل:  npm run db:migrate -w server
 * ═══════════════════════════════════════════════════════════════
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../../../database/schema.sql');

/** يفصل ملف الـ SQL إلى: الجزء العادي + كتل المحفّزات */
function splitSchema(sql) {
  const delimiterStart = sql.indexOf('DELIMITER //');
  if (delimiterStart === -1) return { main: sql, triggers: [] };

  const main = sql.slice(0, delimiterStart);
  const triggerBlock = sql.slice(delimiterStart)
    .replace(/DELIMITER \/\//g, '')
    .replace(/DELIMITER ;/g, '');

  const triggers = triggerBlock
    .split('//')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  return { main, triggers };
}

async function migrate() {
  logger.info('بدء تهيئة قاعدة البيانات...');

  // اتصال بلا تحديد قاعدة — لأنها قد لا تكون موجودة بعد
  const rootConnection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  await rootConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  logger.success(`القاعدة جاهزة: ${env.db.database}`);

  await rootConnection.changeUser({ database: env.db.database });

  const { main, triggers } = splitSchema(readFileSync(SCHEMA_PATH, 'utf8'));

  await rootConnection.query(main);
  logger.success('تم إنشاء الجداول والعروض');

  for (const statement of triggers) {
    try {
      await rootConnection.query(statement);
    } catch (error) {
      logger.warn(`تخطّي محفّز: ${error.message}`);
    }
  }
  logger.success('تم إنشاء المحفّزات (Triggers)');

  const [tables] = await rootConnection.query('SHOW TABLES');
  logger.success(`اكتملت التهيئة — ${tables.length} جدولًا`);

  await rootConnection.end();
}

migrate().catch((error) => {
  logger.error(`فشلت التهيئة: ${error.message}`);
  console.error(error);
  process.exit(1);
});
