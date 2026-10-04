import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import Field from '@/components/ui/Field.jsx';
import AuthHero from './AuthHero.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

/**
 * تسجيل الدخول — بالبريد أو برقم الهاتف في حقل واحد، كما في الخادم.
 * بعد الدخول نعود إلى حيث كان العميل (`?next=` أو الشاشة المحميّة التي
 * أرسلته إلى هنا)، لا إلى الحساب دائمًا: من ضغط «متابعة إلى الدفع»
 * يريد الدفع لا صفحة حسابه.
 */
export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const destination = params.get('next') || location.state?.from || '/account';

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const user = await login({ identifier: form.identifier.trim(), password: form.password });
      toast.success(`أهلًا بعودتك، ${user.full_name?.split(' ')[0] ?? ''}`);
      navigate(destination, { replace: true });
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back stack title="تسجيل الدخول">
      <AuthHero title="أهلًا بعودتك" text="سلتك ونقاطك وطلباتك تنتظرك في حسابك." />

      <form onSubmit={submit} noValidate>
        <Field
          label="البريد الإلكتروني أو رقم الهاتف"
          name="identifier"
          required
          dir="ltr"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          value={form.identifier}
          onChange={(event) => setForm({ ...form, identifier: event.target.value })}
          error={errors.identifier}
        />
        <Field
          label="كلمة المرور"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          error={errors.password}
        />
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !form.identifier || !form.password}>
          {busy ? <span className="spinner" /> : 'دخول'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password" className="link">نسيت كلمة المرور؟</Link>
        <span className="muted">
          ليس لديك حساب؟{' '}
          <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="link">أنشئ حسابك</Link>
        </span>
      </div>
    </Screen>
  );
}
