/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمة المصادقة
 *  تحتوي منطق العمل بالكامل: التسجيل، الدخول، دوران التوكنات،
 *  واستعادة كلمة المرور. الـ controller لا يعرف شيئًا عن SQL.
 * ═══════════════════════════════════════════════════════════════
 */
import crypto from 'node:crypto';
import { query, queryOne, execute, transaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  hashPassword, verifyPassword, signAccessToken,
  generateRefreshToken, sha256, expiryFromNow,
} from '../../utils/security.js';
import { env } from '../../config/env.js';
import { mailer, sendInBackground } from '../../services/mailer/index.js';

/** الحقول الآمنة للإرسال للواجهة — لا تتضمّن أبدًا password_hash */
const PUBLIC_USER_FIELDS = `
  id, uuid, full_name, email, phone, role, avatar_url, gender, birth_date,
  preferred_lang, default_branch_id, loyalty_points, loyalty_tier,
  wallet_balance, total_spent, orders_count, email_verified_at, created_at
`;

const fetchPublicUser = (userId) =>
  queryOne(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`, [userId]);

/**
 * إصدار زوج توكنات جديد وتخزين بصمة توكن التجديد.
 * نخزّن SHA-256 فقط — القيمة الأصلية تُسلَّم للعميل ولا تُحفظ عندنا.
 */
async function issueTokens(user, context = {}) {
  const refreshToken = generateRefreshToken();
  const expiresAt = expiryFromNow(env.jwt.refreshTtl);

  await execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, sha256(refreshToken), context.userAgent?.slice(0, 255) ?? null, context.ip ?? null, expiresAt],
  );

  return {
    access_token: signAccessToken(user),
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: env.jwt.accessTtl,
  };
}

/**
 * إصدار رمز تفعيل بريد جديد.
 * نُبطل الرموز السابقة غير المستخدمة حتى لا يبقى رابطٌ قديم صالحًا
 * بعد أن طلب المستخدم رابطًا جديدًا.
 */
async function issueEmailVerification(userId, email) {
  await execute(
    'UPDATE email_verifications SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId],
  );

  const token = generateRefreshToken();
  await execute(
    `INSERT INTO email_verifications (user_id, email, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [userId, email, sha256(token)],
  );
  return token;
}

export const authService = {
  /** إنشاء حساب جديد + هدية ترحيبية بنقاط الولاء */
  async register(payload, context) {
    const existing = await queryOne(
      'SELECT id, email, phone FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [payload.email, payload.phone],
    );
    if (existing) {
      const field = existing.email === payload.email ? 'البريد الإلكتروني' : 'رقم الهاتف';
      throw ApiError.conflict(`${field} مسجّل بالفعل — جرّب تسجيل الدخول`, { code: 'ACCOUNT_EXISTS' });
    }

    const userId = await transaction(async (cx) => {
      const [result] = await cx.execute(
        `INSERT INTO users (uuid, full_name, email, phone, password_hash, default_branch_id, loyalty_points)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          payload.full_name,
          payload.email,
          payload.phone,
          await hashPassword(payload.password),
          payload.default_branch_id ?? null,
          100, // 100 نقطة ترحيبية
        ],
      );
      const newId = result.insertId;

      await cx.execute(
        `INSERT INTO loyalty_transactions (user_id, type, points, balance_after, note)
         VALUES (?, 'bonus', 100, 100, 'هدية الانضمام إلى رُمّان')`,
        [newId],
      );

      await cx.execute(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES (?, 'loyalty', 'أهلًا بك في رُمّان', 'أضفنا 100 نقطة ترحيبية إلى رصيدك. استخدمها في أول طلب.', '/account/loyalty')`,
        [newId],
      );

      return newId;
    });

    const user = await fetchPublicUser(userId);

    /**
     * رابط التفعيل يُرسَل ولا يُنتظر.
     * الحساب يعمل قبل التفعيل عمدًا: منع العميل من الشراء حتى يفتح
     * بريده يخسر مبيعات حقيقية. التفعيل يخدم استعادة الحساب
     * والتواصل، لا بوّابة دخول.
     */
    sendInBackground(async () => {
      const token = await issueEmailVerification(userId, user.email);
      return mailer.sendVerifyEmail({ to: user.email, name: user.full_name, token });
    });

    const tokens = await issueTokens(user, context);
    return { user, tokens, email_verification_sent: mailer.enabled };
  },

  /** إعادة إرسال رابط التفعيل — بحدّ معدّل من المسار */
  async resendVerification(userId) {
    const user = await queryOne('SELECT id, full_name, email, email_verified_at FROM users WHERE id = ?', [userId]);
    if (!user) throw ApiError.notFound('الحساب غير موجود');
    if (user.email_verified_at) return { already_verified: true };

    const token = await issueEmailVerification(user.id, user.email);
    const result = await mailer.sendVerifyEmail({ to: user.email, name: user.full_name, token });
    if (!result.ok) throw ApiError.badGateway('تعذّر إرسال البريد الآن — حاول بعد قليل', { code: 'MAIL_FAILED' });
    return { sent: true };
  },

  /**
   * تفعيل البريد بالرمز.
   * نطابق البريد المخزَّن وقت الإرسال مع البريد الحالي — فلو غيّره
   * المستخدم بعد الإرسال لم يُفعَّل بريدٌ لم يعد يملكه.
   */
  async verifyEmail(token) {
    const record = await queryOne(
      `SELECT v.id, v.user_id, v.email, u.email AS current_email
         FROM email_verifications v
         JOIN users u ON u.id = v.user_id
        WHERE v.token_hash = ? AND v.used_at IS NULL AND v.expires_at > NOW()`,
      [sha256(token)],
    );
    if (!record) throw ApiError.badRequest('رابط التفعيل غير صالح أو منتهٍ', { code: 'VERIFY_INVALID' });
    if (record.email !== record.current_email) {
      throw ApiError.badRequest('تغيّر بريد الحساب بعد إرسال الرابط — اطلب رابطًا جديدًا', { code: 'EMAIL_CHANGED' });
    }

    await transaction(async (cx) => {
      await cx.execute('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [record.user_id]);
      await cx.execute('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [record.id]);
    });

    return { verified: true };
  },

  /** تسجيل الدخول بالبريد أو رقم الهاتف */
  async login({ identifier, password }, context) {
    const user = await queryOne(
      `SELECT id, uuid, full_name, email, phone, password_hash, role, status
         FROM users
        WHERE (email = ? OR phone = ?) AND deleted_at IS NULL
        LIMIT 1`,
      [identifier.toLowerCase(), identifier],
    );

    // رسالة واحدة للحالتين حتى لا نكشف أي البريدين مسجّل (User Enumeration)
    const genericError = ApiError.unauthorized('بيانات الدخول غير صحيحة', { code: 'BAD_CREDENTIALS' });
    if (!user) throw genericError;
    if (!(await verifyPassword(password, user.password_hash))) throw genericError;
    if (user.status !== 'active') throw ApiError.forbidden('الحساب موقوف — تواصل مع خدمة العملاء');

    await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const publicUser = await fetchPublicUser(user.id);
    const tokens = await issueTokens(user, context);
    return { user: publicUser, tokens };
  },

  /**
   * تجديد الجلسة مع **دوران التوكنات**: كل توكن تجديد يُستخدم مرة واحدة
   * ثم يُبطَل ويُصدر بديله. هذا يحدّ من ضرر أي تسريب.
   */
  async refresh(refreshToken, context) {
    const stored = await queryOne(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.id AS uid, u.uuid, u.role, u.status
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = ?`,
      [sha256(refreshToken)],
    );

    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
      throw ApiError.unauthorized('انتهت الجلسة — سجّل الدخول من جديد', { code: 'REFRESH_INVALID' });
    }
    if (stored.status !== 'active') throw ApiError.forbidden('الحساب موقوف');

    await execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [stored.id]);

    const user = { id: stored.uid, uuid: stored.uuid, role: stored.role };
    return { tokens: await issueTokens(user, context), user: await fetchPublicUser(stored.uid) };
  },

  /** تسجيل الخروج من الجهاز الحالي فقط */
  async logout(refreshToken) {
    if (!refreshToken) return;
    await execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
      [sha256(refreshToken)],
    );
  },

  /** تسجيل الخروج من كل الأجهزة */
  async logoutAll(userId) {
    await execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId],
    );
  },

  /**
   * طلب استعادة كلمة المرور.
   *
   * نُعيد نفس الرسالة سواء وُجد البريد أم لا — وإلّا صار المسار أداةً
   * لمعرفة أي البُرد مسجّلة عندنا. والرمز لا يُعاد في الاستجابة أبدًا،
   * ولا حتى في بيئة التطوير: مسارٌ يسرّب رمزًا في وضعٍ ما هو مسارٌ
   * سيُنشَر يومًا وهو يسرّب.
   */
  async forgotPassword(email) {
    const user = await queryOne(
      'SELECT id, full_name, email FROM users WHERE email = ? AND deleted_at IS NULL',
      [email],
    );
    if (!user) return { sent: true };

    const token = generateRefreshToken();
    await execute(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [user.id, sha256(token)],
    );

    sendInBackground(() => mailer.sendPasswordReset({
      to: user.email, name: user.full_name, token,
    }));

    return { sent: true };
  },

  /** تعيين كلمة مرور جديدة عبر الرمز + إبطال كل الجلسات القديمة */
  async resetPassword({ token, password }) {
    const record = await queryOne(
      `SELECT id, user_id FROM password_resets
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [sha256(token)],
    );
    if (!record) throw ApiError.badRequest('رمز الاستعادة غير صالح أو منتهٍ', { code: 'RESET_INVALID' });

    await transaction(async (cx) => {
      await cx.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(password), record.user_id]);
      await cx.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [record.id]);
      await cx.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [record.user_id]);
    });

    return { reset: true };
  },

  /** تغيير كلمة المرور من داخل الحساب */
  async changePassword(userId, { current_password, new_password }) {
    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !(await verifyPassword(current_password, user.password_hash))) {
      throw ApiError.badRequest('كلمة المرور الحالية غير صحيحة', { code: 'WRONG_PASSWORD' });
    }
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(new_password), userId]);
    await this.logoutAll(userId);
    return { changed: true };
  },

  /** الجلسات النشطة للمستخدم (لعرضها في إعدادات الأمان) */
  async listSessions(userId) {
    return query(
      `SELECT id, user_agent, ip_address, created_at, expires_at
         FROM refresh_tokens
        WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
        ORDER BY created_at DESC`,
      [userId],
    );
  },
};
