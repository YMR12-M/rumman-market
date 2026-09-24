import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '@/components/ui/Field.jsx';
import Logo from '@/components/brand/Logo.jsx';
import { IconGift, IconCheck } from '@/lib/icons.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { branches, branchId } = useBranch();
  const toast = useToast();

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', default_branch_id: branchId ?? '' });
  const [errors, setErrors] = useState({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      await register({ ...form, default_branch_id: form.default_branch_id || undefined });
      toast.success('أهلًا بك في رُمّان — أضفنا 100 نقطة ترحيبية إلى رصيدك');
      navigate('/account', { replace: true });
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
          <span className="badge badge--saffron" style={{ fontSize: 'var(--t-xs)' }}>
            <IconGift size={13} /> 100 نقطة ترحيبية
          </span>
          <h2 style={{ color: 'var(--ivory)', marginTop: 'var(--s-4)', fontSize: 'var(--t-xl)' }}>
            انضم إلى رُمّان، وابدأ برصيد.
          </h2>
          <p style={{ color: 'rgba(251,248,241,.74)', marginTop: 'var(--s-3)', fontSize: 'var(--t-sm)' }}>
            كل 20 نقطة تساوي جنيهًا في طلبك التالي. بلا اشتراك، وبلا رسوم، وبلا شروط مخفيّة.
          </p>

          <ul style={{ marginTop: 'var(--s-6)', display: 'grid', gap: 'var(--s-3)', color: 'rgba(251,248,241,.74)', fontSize: 'var(--t-sm)' }}>
            {['ترقية تلقائية للفئة الذهبية عند 15,000 ج.م', 'عروض خاصة بالأعضاء قبل إعلانها', 'دعوات لتذوّق المنتجات الجديدة'].map((line) => (
              <li key={line} style={{ display: 'flex', gap: 8 }}>
                <IconCheck size={16} style={{ color: 'var(--gold-400)', flexShrink: 0, marginTop: 3 }} /> {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth__form">
        <div className="auth__form-inner">
          <span className="eyebrow">حساب جديد</span>
          <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-5)' }}>أنشئ حسابك</h1>

          <form onSubmit={submit} noValidate>
            <Field label="الاسم بالكامل" name="full_name" required error={errors.full_name} value={form.full_name} onChange={update('full_name')} autoComplete="name" />
            <Field label="البريد الإلكتروني" name="email" type="email" required error={errors.email} value={form.email} onChange={update('email')} autoComplete="email" />
            <Field label="رقم الهاتف" name="phone" required error={errors.phone} value={form.phone} onChange={update('phone')} placeholder="01xxxxxxxxx" autoComplete="tel" />
            <Field
              label="كلمة المرور"
              name="password"
              type="password"
              required
              error={errors.password}
              hint="8 أحرف على الأقل، وتحتوي على حرف ورقم"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
            />
            <Field label="الفرع المفضّل" name="default_branch_id" as="select" value={form.default_branch_id} onChange={update('default_branch_id')}>
              <option value="">اختر لاحقًا</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
            </Field>

            <label className="checkbox" style={{ marginBottom: 'var(--s-4)' }}>
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
              <span>أوافق على شروط الاستخدام وسياسة الخصوصية.</span>
            </label>

            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !accepted}>
              {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--s-5)', fontSize: 'var(--t-sm)' }}>
            لديك حساب بالفعل؟ <Link to="/login" className="link-underline">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
