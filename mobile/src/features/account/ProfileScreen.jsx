import { useEffect, useState } from 'react';
import Screen from '@/components/shell/Screen.jsx';
import Field from '@/components/ui/Field.jsx';
import { authService, userService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDateTime } from '@/lib/format.js';

/**
 * البيانات الشخصية، وكلمة المرور، والأجهزة المسجّلة الدخول.
 * تغيير كلمة المرور يُخرج كل الجلسات في الخادم — ومنها هذا الجهاز،
 * فيعيده التطبيق إلى شاشة الدخول ولا يتركه بجلسة ميتة.
 */
export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const { branches } = useBranch();
  const toast = useToast();

  const [form, setForm] = useState({ full_name: '', phone: '', gender: 'unspecified', birth_date: '', default_branch_id: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changing, setChanging] = useState(false);

  const sessions = useAsync(() => authService.sessions(), []);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      gender: user.gender ?? 'unspecified',
      birth_date: user.birth_date ? String(user.birth_date).slice(0, 10) : '',
      default_branch_id: user.default_branch_id ?? '',
    });
  }, [user]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await userService.updateProfile({
        ...form,
        birth_date: form.birth_date || null,
        default_branch_id: form.default_branch_id || null,
      });
      await refreshUser();
      toast.success('تم حفظ بياناتك');
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordErrors({});
    setChanging(true);
    try {
      await authService.changePassword(passwords);
      toast.success('تم تغيير كلمة المرور — سجّل الدخول من جديد');
      setPasswords({ current_password: '', new_password: '' });
      await logout();
    } catch (error) {
      setPasswordErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <Screen title="بياناتي" back="/account">
      <form className="card card--pad" onSubmit={save} noValidate>
        <h2 className="card__title">بياناتك</h2>
        <Field label="الاسم بالكامل" name="full_name" required autoComplete="name" value={form.full_name} onChange={update('full_name')} error={errors.full_name} />
        <Field label="رقم الهاتف" name="phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={update('phone')} error={errors.phone} />
        <Field label="البريد الإلكتروني" name="email" dir="ltr" value={user?.email ?? ''} disabled hint="لتغيير البريد تواصل مع خدمة العملاء" />
        <div className="field-grid">
          <Field label="تاريخ الميلاد" name="birth_date" type="date" value={form.birth_date} onChange={update('birth_date')} error={errors.birth_date} />
          <Field label="النوع" name="gender" as="select" value={form.gender} onChange={update('gender')}>
            <option value="unspecified">بلا تحديد</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </Field>
        </div>
        {branches.length > 0 && (
          <Field label="الفرع المفضّل" name="default_branch_id" as="select" value={form.default_branch_id} onChange={update('default_branch_id')} error={errors.default_branch_id}>
            <option value="">بلا تفضيل</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
          </Field>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
          {saving ? <span className="spinner" /> : 'حفظ التغييرات'}
        </button>
      </form>

      <form className="card card--pad" onSubmit={changePassword} noValidate style={{ marginBlockStart: 'var(--s-4)' }}>
        <h2 className="card__title">كلمة المرور</h2>
        <Field
          label="كلمة المرور الحالية"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          value={passwords.current_password}
          onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })}
          error={passwordErrors.current_password}
        />
        <Field
          label="كلمة المرور الجديدة"
          name="new_password"
          type="password"
          required
          autoComplete="new-password"
          hint="8 أحرف على الأقل، وتحتوي على حرف ورقم"
          value={passwords.new_password}
          onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })}
          error={passwordErrors.new_password}
        />
        <p className="text-xs muted" style={{ marginBlockEnd: 'var(--s-3)' }}>تغيير كلمة المرور يُخرج كل الأجهزة المسجّلة بحسابك، ومنها هذا الجهاز.</p>
        <button type="submit" className="btn btn--outline btn--block" disabled={changing || !passwords.current_password || !passwords.new_password}>
          {changing ? <span className="spinner" /> : 'تغيير كلمة المرور'}
        </button>
      </form>

      {(sessions.data?.length ?? 0) > 0 && (
        <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
          <h2 className="card__title">الأجهزة المسجّلة الدخول</h2>
          <ul className="stack--tight">
            {sessions.data.map((session) => (
              <li key={session.id} className="text-xs" style={{ borderBlockStart: '1px solid var(--line-soft)', paddingBlockStart: 'var(--s-2)' }}>
                <span className="soft" style={{ display: 'block', overflowWrap: 'anywhere' }}>{session.user_agent ?? 'جهاز غير معروف'}</span>
                <span className="muted">
                  {session.ip_address && <><span className="ltr">{session.ip_address}</span> · </>}
                  {formatDateTime(session.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}
