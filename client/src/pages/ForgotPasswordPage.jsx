/**
 * طلب استعادة كلمة المرور.
 *
 * الرسالة بعد الإرسال واحدة دائمًا — سواء كان البريد مسجّلًا أم لا.
 * هذا مقصود: صفحةٌ تقول «هذا البريد غير مسجّل» تتحوّل إلى أداة يعرف
 * بها أي أحد من عملاؤنا.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '@/components/ui/Field.jsx';
import Logo from '@/components/brand/Logo.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { IconMail } from '@/lib/icons.jsx';
import { authService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';

export default function ForgotPasswordPage() {
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
    <div className="auth">
      <aside className="auth__aside">
        <Logo inverse size={38} asLink={false} />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <BrandMark size={90} style={{ color: 'var(--gold-400)' }} />
          <h2 style={{ color: 'var(--ivory)', marginTop: 'var(--s-5)', fontSize: 'var(--t-xl)' }}>
            كلمة مرور واحدة تفصلك عن حسابك.
          </h2>
          <p style={{ marginTop: 'var(--s-4)', color: 'rgba(255,244,247,.6)', fontSize: 'var(--t-sm)' }}>
            نرسل رابطًا صالحًا لساعة واحدة، يُستخدم مرّة واحدة فقط.
          </p>
        </div>
      </aside>

      <div className="auth__form">
        <div className="auth__form-inner">
          {sent ? (
            <>
              <div className="empty__mark" style={{ margin: '0 0 var(--s-4)' }}><IconMail size={36} /></div>
              <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-3)' }}>راجع بريدك</h1>
              <p className="lede" style={{ fontSize: 'var(--t-sm)' }}>
                إن كان <strong dir="ltr">{email}</strong> مسجّلًا عندنا، فستصلك رسالة الاستعادة خلال دقائق.
                تفقّد مجلّد الرسائل غير المرغوبة إن لم تجدها.
              </p>
              <Link to="/login" className="btn btn--outline" style={{ marginTop: 'var(--s-5)' }}>
                العودة لتسجيل الدخول
              </Link>
            </>
          ) : (
            <>
              <span className="eyebrow">استعادة الحساب</span>
              <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-2)' }}>نسيت كلمة المرور؟</h1>
              <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-5)' }}>
                اكتب بريدك المسجّل وسنرسل لك رابط تعيين كلمة مرور جديدة.
              </p>

              <form onSubmit={submit} noValidate>
                <Field
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  dir="ltr"
                  error={errors.email}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
                  {busy ? 'جارٍ الإرسال…' : 'أرسل رابط الاستعادة'}
                </button>
              </form>

              <p style={{ marginTop: 'var(--s-5)', fontSize: 'var(--t-sm)' }}>
                تذكّرتها؟ <Link to="/login" className="link-underline">عُد لتسجيل الدخول</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
