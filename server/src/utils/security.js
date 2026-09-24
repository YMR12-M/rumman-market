/**
 * أدوات التشفير والتوكنات.
 *  • كلمات المرور: bcrypt بمعامل كلفة 12.
 *  • Access Token: JWT قصير العمر يُرسل في ترويسة Authorization.
 *  • Refresh Token: سلسلة عشوائية تُخزَّن في القاعدة بصيغة SHA-256 فقط،
 *    حتى لو تسرّبت قاعدة البيانات لا يمكن استخدام التوكنات.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/** توليد Access Token يحمل الحدّ الأدنى من البيانات */
export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, uuid: user.uuid, role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl, issuer: 'rumman-api' },
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.accessSecret, { issuer: 'rumman-api' });

/** توكن تجديد عشوائي 64 بايت (يُسلَّم للعميل مرة واحدة فقط) */
export const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

/** بصمة SHA-256 — نخزّنها بدل القيمة الأصلية */
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** تاريخ انتهاء التوكن اعتمادًا على مدّة نصية مثل "30d" أو "12h" */
export function expiryFromNow(ttl) {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const units = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
  return new Date(Date.now() + Number(match[1]) * units[match[2]]);
}

/** معرّف عشوائي قصير للاستخدام في أكواد التتبّع */
export const randomCode = (length = 8) =>
  crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
