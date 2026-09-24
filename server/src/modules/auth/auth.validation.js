import { z } from 'zod';

/** رقم هاتف مصري: 010/011/012/015 + 8 أرقام */
const egyptianPhone = z
  .string()
  .regex(/^01[0125][0-9]{8}$/, 'رقم الهاتف يجب أن يكون رقمًا مصريًا صحيحًا (11 رقمًا)');

/** كلمة مرور بحد أدنى معقول دون تعقيد يُنفّر المستخدم */
const password = z
  .string()
  .min(8, 'كلمة المرور 8 أحرف على الأقل')
  .max(72, 'كلمة المرور طويلة جدًا')
  .regex(/[a-zA-Z]/, 'يجب أن تحتوي على حرف واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل');

export const registerSchema = z.object({
  full_name: z.string().trim().min(3, 'الاسم ثلاثة أحرف على الأقل').max(120),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  phone: egyptianPhone,
  password,
  default_branch_id: z.coerce.number().int().positive().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'أدخل البريد الإلكتروني أو رقم الهاتف'),
  password: z.string().min(1, 'أدخل كلمة المرور'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(20, 'توكن التجديد مفقود'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'رمز الاستعادة غير صالح'),
  password,
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'أدخل كلمة المرور الحالية'),
  new_password: password,
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20, 'رمز التفعيل غير صالح'),
});
