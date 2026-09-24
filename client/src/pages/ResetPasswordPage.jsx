/**
 * تعيين كلمة مرور جديدة بالرمز.
 * الرمز يأتي في الرابط، ويُستهلك عند الاستخدام — وكل جلسات الحساب
 * القديمة تُبطَل في الخادم، فمن سرق الجلسة يخرج معها.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Field from '@/components/ui/Field.jsx';
import Logo from '@/components/brand/Logo.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { authService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';

export default function ResetPasswordPage() {
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

  return (
    <div className="auth">
      <aside className="auth__aside">
        <Logo inverse size={38} asLink={false} />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <BrandMark size={90} style={{ color: 'var(--gold-400)' }} />
          <h2 style={{ color: 'var(--ivory)', marginTop: 'var(--s-5)', fontSize: 'var(--t-xl)' }}>
            كلمة مرور جديدة، وكل الأجهزة القديمة تخرج.
          </h2>
        </div>
      </aside>

      <div className="auth__form">
        <div className="auth__form-inner">
          <span className="eyebrow">استعادة الحساب</span>
          <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-5)' }}>كلمة مرور جديدة</h1>

          {!token ? (
            <>
              <p className="field__error">الرابط ناقص أو تالف — اطلب رابطًا جديدًا.</p>
              <Link to="/forgot-password" className="btn btn--primary" style={{ marginTop: 'var(--s-4)' }}>
                اطلب رابطًا جديدًا
              </Link>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <Field
                label="كلمة المرور الجديدة"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                hint="8 أحرف على الأقل، مع حرف ورقم"
                error={errors.password}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />

              <Field
                label="تأكيد كلمة المرور"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                error={errors.confirm}
                value={form.confirm}
                onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              />

              <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'احفظ كلمة المرور'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
