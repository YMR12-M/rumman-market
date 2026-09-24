/**
 * محتوى الواجهة العامة: المساحات التحريرية على الصفحة الرئيسية،
 * رسائل «اتصل بنا»، والاشتراك في النشرة البريدية.
 */
import { Router } from 'express';
import { z } from 'zod';
import { query, execute } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuthenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiters.js';

const router = Router();

/**
 * بيانات المتجر العامّة — يقرأها كل زائر عند فتح الموقع.
 *
 * وجودها هو ما يسمح للواجهة ألّا تكتب في كودها «سبعة فروع» أو «ستة
 * عشر قسمًا»: الأرقام تأتي من الواقع، فإن أضاف المدير فرعًا تغيّرت
 * الصفحة الرئيسية وحدها. وإن كان المتجر فارغًا قالت الواجهة ذلك
 * بصدق بدل ادّعاء ما ليس موجودًا.
 */
router.get('/site', asyncHandler(async (_req, res) => {
  const [settingsRows, [counts], announcements] = await Promise.all([
    query("SELECT `key`, `value` FROM settings WHERE `group` IN ('brand','contact','loyalty','general')"),
    query(`
      SELECT
        (SELECT COUNT(*) FROM branches   WHERE deleted_at IS NULL AND status = 'active') AS branches,
        (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND status = 'active') AS categories,
        (SELECT COUNT(*) FROM products   WHERE deleted_at IS NULL AND status = 'active') AS products,
        (SELECT COUNT(DISTINCT governorate) FROM branches WHERE deleted_at IS NULL AND status = 'active') AS governorates,
        (SELECT MIN(opened_year) FROM branches WHERE deleted_at IS NULL AND opened_year IS NOT NULL) AS since_year,
        (SELECT MIN(NULLIF(free_delivery_over, 0)) FROM branches WHERE deleted_at IS NULL AND status = 'active') AS free_delivery_from
    `),
    // الشريط العلوي يعرض عروضًا حقيقية سارية — لا شعارات مكتوبة في الكود
    query(`
      SELECT title_ar, cta_href FROM promotions
       WHERE status = 'active' AND kind = 'strip' AND starts_at <= NOW() AND ends_at >= NOW()
       ORDER BY sort_order ASC LIMIT 5
    `),
  ]);

  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));

  ok(res, {
    brand: {
      name: settings.brand_name_ar || 'رُمّان',
      tagline: settings.brand_tagline || '',
    },
    support: {
      phone: settings.support_phone || '',
      email: settings.support_email || '',
    },
    loyalty: {
      points_per_egp: Number(settings.points_per_egp || 1),
      point_value_egp: Number(settings.point_value_egp || 0.05),
      max_redemption_percent: Number(settings.max_points_redemption_percent || 50),
    },
    counts: {
      branches: Number(counts.branches),
      categories: Number(counts.categories),
      products: Number(counts.products),
      governorates: Number(counts.governorates),
    },
    since_year: counts.since_year ? Number(counts.since_year) : null,
    free_delivery_from: counts.free_delivery_from ? Number(counts.free_delivery_from) : null,
    announcements: announcements.map((row) => ({ text: row.title_ar, href: row.cta_href })),
    store_open: (settings.store_status || 'open') === 'open',
  });
}));

/** العروض التحريرية النشطة حاليًا */
router.get('/promotions', asyncHandler(async (_req, res) => {
  ok(res, await query(
    `SELECT p.slug, p.title_ar, p.subtitle_ar, p.kind, p.cta_label, p.cta_href, p.accent,
            c.slug AS category_slug, c.name_ar AS category_name, c.motif AS category_motif
       FROM promotions p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND p.starts_at <= NOW() AND p.ends_at >= NOW()
      ORDER BY p.sort_order ASC`,
  ));
}));

const contactSchema = z.object({
  name: z.string().trim().min(3, 'الاسم مطلوب').max(120),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, 'رقم هاتف مصري غير صحيح').optional(),
  subject: z.string().trim().min(3, 'الموضوع مطلوب').max(160),
  message: z.string().trim().min(10, 'اكتب رسالتك بتفصيل أكبر').max(2000),
});

router.post('/contact', writeLimiter, optionalAuthenticate, validate({ body: contactSchema }), asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  await execute(
    'INSERT INTO contact_messages (user_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user?.id ?? null, name, email, phone ?? null, subject, message],
  );
  created(res, null, 'وصلتنا رسالتك — نردّ عادةً خلال يوم عمل');
}));

router.post('/newsletter', writeLimiter, validate({ body: z.object({ email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح') }) }),
  asyncHandler(async (req, res) => {
    // ON DUPLICATE يمنع خطأ التكرار ويعيد تفعيل المشترك المنسحب سابقًا
    await execute(
      `INSERT INTO newsletter_subscribers (email) VALUES (?)
       ON DUPLICATE KEY UPDATE status = 'subscribed'`,
      [req.body.email],
    );
    ok(res, null, { message: 'اشتركت في نشرة رُمّان' });
  }));

export default router;
