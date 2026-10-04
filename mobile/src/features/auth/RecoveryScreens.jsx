/**
 * استعادة الحساب: طلب رابط، وتعيين كلمة جديدة بالرمز، وتفعيل البريد.
 * ثلاث شاشات قصيرة تفتح غالبًا من رسالة بريد على الهاتف نفسه.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import Field from '@/components/ui/Field.jsx';
import AuthHero from './AuthHero.jsx';
import { EmptyState } from '@/components/ui/Feedback.jsx';
import { IconAlert, IconCheck, IconMail } from '@/lib/icons.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { authService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';

/**
 * طلب رابط الاستعادة.
 * الرسالة بعد الإرسال واحدة دائمًا — سواء كان البريد مسجّلًا أم لا. شاشةٌ
 * تقول «هذا البريد غير مسجّل» تصير أداة يعرف بها أيّ أحد من عملاؤنا.
 */
export function ForgotPasswordScreen() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back stack title="استعادة الحساب">
      {sent ? (
        <EmptyState
          icon={<IconMail size={34} />}
          title="راجع بريدك"
          text={`إن كان ${email} مسجّلًا عندنا، فستصلك رسالة الاستعادة خلال دقائق. تفقّد مجلّد الرسائل غير المرغوبة إن لم تجدها.`}
          actionLabel="العودة لتسجيل الدخول"
          to="/login"
        />
      ) : (
        <>
          <AuthHero title="نسيت كلمة المرور؟" text="نرسل رابطًا صالحًا لساعة واحدة، يُستخدم مرّة واحدة فقط." />
          <form onSubmit={submit} noValidate>
            <Field
              label="البريد الإلكتروني"
              name="email"
              type="email"
              required
              dir="ltr"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
            />
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !email.includes('@')}>
              {busy ? <span className="spinner" /> : 'أرسل رابط الاستعادة'}
            </button>
          </form>
          <p className="auth-links"><Link to="/login" className="link">تذكّرتها؟ عُد لتسجيل الدخول</Link></p>
        </>
      )}
    </Screen>
  );
}

/**
 * كلمة مرور جديدة بالرمز القادم في الرابط. الرمز يُستهلك عند
 * الاستخدام، وكل جلسات الحساب القديمة تُبطَل في الخادم.
 */
export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    if (form.password !== form.confirm) {
      setErrors({ confirm: 'كلمتا المرور غير متطابقتين' });
      return;
    }
    setBusy(true);
    try {
      await authService.resetPassword({ token, password: form.password });
      toast.success('تم تعيين كلمة المرور — سجّل الدخول الآن');
      navigate('/login', { replace: true });
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Screen back stack title="كلمة مرور جديدة">
        <EmptyState icon={<IconAlert size={34} />} title="الرابط ناقص أو تالف" text="اطلب رابطًا جديدًا من شاشة الاستعادة." actionLabel="اطلب رابطًا جديدًا" to="/forgot-password" />
      </Screen>
    );
  }

  return (
    <Screen back stack title="كلمة مرور جديدة">
      <AuthHero title="كلمة مرور جديدة" text="وكل الأجهزة المسجّلة بحسابك تخرج تلقائيًا." />
      <form onSubmit={submit} noValidate>
        <Field
          label="كلمة المرور الجديدة"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          hint="8 أحرف على الأقل، مع حرف ورقم"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          error={errors.password}
        />
        <Field
          label="تأكيد كلمة المرور"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          error={errors.confirm}
        />
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !form.password}>
          {busy ? <span className="spinner" /> : 'احفظ كلمة المرور'}
        </button>
      </form>
    </Screen>
  );
}

/** تفعيل البريد — تعمل فور فتح الرابط وتقول النتيجة بوضوح */
export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState({ status: 'working', message: '' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'الرابط ناقص أو تالف.' });
      return undefined;
    }
    let alive = true;
    authService.verifyEmail(token)
      .then(() => alive && setState({ status: 'done', message: 'تم تفعيل بريدك بنجاح.' }))
      .catch((error) => alive && setState({ status: 'error', message: error.message }));
    return () => { alive = false; };
  }, [token]);

  const icon = state.status === 'working'
    ? <BrandMark size={36} />
    : state.status === 'done' ? <IconCheck size={36} /> : <IconAlert size={34} />;

  return (
    <Screen stack title="تفعيل البريد">
      <EmptyState
        icon={icon}
        title={state.status === 'working' ? 'جارٍ التفعيل…' : state.status === 'done' ? 'أهلًا بك' : 'تعذّر التفعيل'}
        text={state.message}
        actionLabel={state.status === 'working' ? undefined : state.status === 'done' ? 'ابدأ التسوّق' : 'اذهب إلى حسابك'}
        to={state.status === 'done' ? '/' : '/account'}
      />
    </Screen>
  );
}
