import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ActionBar from '@/components/shell/ActionBar.jsx';
import Field from '@/components/ui/Field.jsx';
import AuthHero from './AuthHero.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { num } from '@/lib/format.js';

/** أيّ خطوة يقع فيها كل حقل — لنعيد العميل إليها إن رفضه الخادم */
const FIELD_STEP = { full_name: 1, phone: 1, email: 2, password: 2, default_branch_id: 3 };
const STEPS = ['من أنت', 'بيانات الدخول', 'فرعك'];

/**
 * ═══════════════════════════════════════════════════════════════
 *  إنشاء حساب — ثلاث خطوات قصيرة بدل نموذج طويل واحد
 *
 *  على شاشة صغيرة ولوحة مفاتيح تغطّي نصفها، خمسة حقول في صفحة واحدة
 *  تعني تمريرًا أعمى بين حقول لا تُرى. خطوتان بحقلين وثالثة للاختيار
 *  تُبقي كل شيء فوق لوحة المفاتيح.
 *
 *  التحقّق النهائي في الخادم؛ إن رفض حقلًا من خطوة سابقة نعيد العميل
 *  إليها وخطؤه ظاهر تحت الحقل.
 * ═══════════════════════════════════════════════════════════════
 */
export default function RegisterScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register } = useAuth();
  const { branches, branchId } = useBranch();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', default_branch_id: branchId ?? '' });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const stepValid = step === 1
    ? form.full_name.trim().length >= 3 && form.phone.trim().length >= 10
    : step === 2
      ? form.email.includes('@') && form.password.length >= 8
      : accepted;

  const submit = async () => {
    setErrors({});
    setBusy(true);
    try {
      const user = await register({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        default_branch_id: form.default_branch_id || undefined,
      });
      const points = Number(user?.loyalty_points ?? 0);
      toast.success(points > 0
        ? `أهلًا بك في رُمّان — في رصيدك ${num(points)} نقطة ترحيبية`
        : 'أهلًا بك في رُمّان');
      navigate(params.get('next') || '/account', { replace: true });
    } catch (error) {
      const fieldErrors = error.errors ?? {};
      setErrors(fieldErrors);
      const firstStep = Math.min(...Object.keys(fieldErrors).map((key) => FIELD_STEP[key] ?? 3));
      if (Number.isFinite(firstStep)) setStep(firstStep);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const next = (event) => {
    event?.preventDefault();
    if (!stepValid) return;
    if (step < STEPS.length) setStep(step + 1);
    else submit();
  };

  return (
    <Screen
      stack
      actionbar
      title="حساب جديد"
      back={step === 1 ? true : undefined}
      lead={step > 1 ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep(step - 1)}>رجوع</button> : undefined}
    >
      <AuthHero title="انضم إلى رُمّان" text="سلّة تنتقل معك بين أجهزتك، ونقاط على كل طلب، وتتبّع مباشر حتى باب بيتك." />

      <div className="steps" aria-label={`الخطوة ${step} من ${STEPS.length}`}>
        <div className="steps__bar" aria-hidden="true">
          {STEPS.map((label, index) => <span key={label} className={`steps__seg${index < step ? ' is-done' : ''}`} />)}
        </div>
        <div className="steps__label">
          <strong>{STEPS[step - 1]}</strong>
          <span>الخطوة <span className="numeral">{step}</span> من <span className="numeral">{STEPS.length}</span></span>
        </div>
      </div>

      <form onSubmit={next} noValidate>
        {step === 1 && (
          <>
            <Field label="الاسم بالكامل" name="full_name" required autoComplete="name" value={form.full_name} onChange={update('full_name')} error={errors.full_name} />
            <Field
              label="رقم الهاتف"
              name="phone"
              required
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              value={form.phone}
              onChange={update('phone')}
              error={errors.phone}
              hint="نتواصل عليه بخصوص طلباتك فقط"
            />
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="البريد الإلكتروني"
              name="email"
              type="email"
              required
              dir="ltr"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              error={errors.email}
            />
            <Field
              label="كلمة المرور"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              error={errors.password}
              hint="8 أحرف على الأقل، وتحتوي على حرف ورقم"
            />
          </>
        )}

        {step === 3 && (
          <>
            {branches.length > 0 && (
              <Field label="الفرع المفضّل" name="default_branch_id" as="select" value={form.default_branch_id} onChange={update('default_branch_id')} error={errors.default_branch_id}>
                <option value="">اختر لاحقًا</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
              </Field>
            )}
            <label className="checkbox">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>أوافق على شروط الاستخدام وسياسة الخصوصية.</span>
            </label>
          </>
        )}

        {/* زرّ الإرسال مخفيّ كي يعمل «التالي» في لوحة المفاتيح */}
        <button type="submit" className="visually-hidden" tabIndex={-1}>متابعة</button>
      </form>

      <p className="auth-links">
        <span className="muted">لديك حساب بالفعل؟ <Link to="/login" className="link">سجّل الدخول</Link></span>
      </p>

      <ActionBar>
        <button type="button" className="btn btn--primary btn--lg grow" onClick={next} disabled={!stepValid || busy}>
          {busy ? <span className="spinner" /> : step < STEPS.length ? 'التالي' : 'إنشاء الحساب'}
        </button>
      </ActionBar>
    </Screen>
  );
}
