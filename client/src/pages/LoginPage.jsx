import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Field from '@/components/ui/Field.jsx';
import Logo from '@/components/brand/Logo.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const destination = searchParams.get('next') || location.state?.from || '/account';

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const user = await login(form);
      toast.success(`أهلًا بعودتك، ${user.full_name.split(' ')[0]}`);
      navigate(destination, { replace: true });
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth__aside">
        <Logo inverse size={38} asLink={false} />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <BrandMark size={90} style={{ color: 'var(--gold-400)' }} />
          <h2 style={{ color: 'var(--ivory)', marginTop: 'var(--s-5)', fontSize: 'var(--t-xl)' }}>
            حسابك في رُمّان يحفظ أكثر من بياناتك.
          </h2>
          <ul style={{ marginTop: 'var(--s-5)', display: 'grid', gap: 'var(--s-3)', color: 'rgba(251,248,241,.74)', fontSize: 'var(--t-sm)' }}>
            {[
              'سلّتك تنتقل معك بين الموبايل واللابتوب.',
              'نقاط ولاء على كل جنيه، تُخصم من طلبك التالي.',
              'إعادة طلب سابق بضغطة واحدة.',
              'تتبّع مباشر لكل مرحلة حتى باب بيتك.',
            ].map((line) => <li key={line}>— {line}</li>)}
          </ul>
        </div>
      </aside>

      <div className="auth__form">
        <div className="auth__form-inner">
          <span className="eyebrow">أهلًا بعودتك</span>
          <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-5)' }}>تسجيل الدخول</h1>

          <form onSubmit={submit} noValidate>
            <Field
              label="البريد الإلكتروني أو رقم الهاتف"
              name="identifier"
              required
              autoComplete="username"
              error={errors.identifier}
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
            />

            <Field
              label="كلمة المرور"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              error={errors.password}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />

            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
              {busy ? 'جارٍ الدخول…' : 'دخول'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-sm)' }}>
            <Link to="/forgot-password" className="link-underline">نسيت كلمة المرور؟</Link>
          </p>

          <p style={{ marginTop: 'var(--s-5)', fontSize: 'var(--t-sm)' }}>
            ليس لديك حساب؟{' '}
            <Link to="/register" className="link-underline">أنشئ حسابك في دقيقة</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
