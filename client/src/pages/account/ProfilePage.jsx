import { useEffect, useState } from 'react';
import Field from '@/components/ui/Field.jsx';
import { authService, userService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDateTime } from '@/lib/format.js';

/** البيانات الشخصية + الأمان + الجلسات النشطة */
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { branches } = useBranch();
  const toast = useToast();

  const [form, setForm] = useState({ full_name: '', phone: '', gender: 'unspecified', birth_date: '', default_branch_id: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  const sessions = useAsync(() => authService.sessions(), []);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      gender: user.gender ?? 'unspecified',
      birth_date: user.birth_date ?? '',
      default_branch_id: user.default_branch_id ?? '',
    });
  }, [user]);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const saveProfile = async (event) => {
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
    try {
      await authService.changePassword(passwordForm);
      toast.success('تم تغيير كلمة المرور — سجّل الدخول من جديد');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (error) {
      setPasswordErrors(error.errors ?? {});
      toast.error(error.message);
    }
  };

  return (
    <div className="stack">
      <form className="panel" onSubmit={saveProfile}>
        <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>بياناتك</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s-3)' }}>
          <Field label="الاسم بالكامل" name="full_name" required error={errors.full_name} value={form.full_name} onChange={update('full_name')} />
          <Field label="رقم الهاتف" name="phone" error={errors.phone} value={form.phone} onChange={update('phone')} />
          <Field label="تاريخ الميلاد" name="birth_date" type="date" value={form.birth_date ?? ''} onChange={update('birth_date')} hint="نرسل لك هدية في عيد ميلادك" />
          <Field label="النوع" name="gender" as="select" value={form.gender} onChange={update('gender')}>
            <option value="unspecified">أفضّل عدم التحديد</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </Field>
          <Field label="الفرع المفضّل" name="default_branch_id" as="select" value={form.default_branch_id ?? ''} onChange={update('default_branch_id')}>
            <option value="">بلا تفضيل</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
          </Field>
          <Field label="البريد الإلكتروني" name="email" value={user?.email ?? ''} disabled hint="لتغيير البريد تواصل مع خدمة العملاء" />
        </div>

        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button>
      </form>

      <form className="panel" onSubmit={changePassword}>
        <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>كلمة المرور</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s-3)' }}>
          <Field
            label="كلمة المرور الحالية" name="current_password" type="password" required
            error={passwordErrors.current_password}
            value={passwordForm.current_password}
            onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
          />
          <Field
            label="كلمة المرور الجديدة" name="new_password" type="password" required
            error={passwordErrors.new_password}
            hint="8 أحرف على الأقل، وتحتوي على حرف ورقم"
            value={passwordForm.new_password}
            onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
          />
        </div>
        <button type="submit" className="btn btn--outline">تغيير كلمة المرور</button>
      </form>

      <div className="panel">
        <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)' }}>الأجهزة النشطة</h3>
        <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
          هذه الأجهزة مسجّلة الدخول بحسابك حاليًا. تغيير كلمة المرور يُخرجها جميعًا.
        </p>
        <div className="table-wrap" style={{ marginTop: 'var(--s-3)' }}>
          <table className="table">
            <thead><tr><th>الجهاز</th><th>عنوان IP</th><th>بدأت</th></tr></thead>
            <tbody>
              {(sessions.data ?? []).map((session) => (
                <tr key={session.id}>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user_agent ?? 'غير معروف'}</td>
                  <td className="numeral muted">{session.ip_address ?? '—'}</td>
                  <td className="muted">{formatDateTime(session.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
