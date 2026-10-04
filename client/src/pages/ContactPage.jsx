import { useState } from 'react';
import Field from '@/components/ui/Field.jsx';
import SectionHead from '@/components/brand/SectionHead.jsx';
import { IconPhone, IconMail, IconClock, IconCheck } from '@/lib/icons.jsx';
import { contentService } from '@/services/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { CONTACT_SUBJECTS, SUPPORT_HOURS, QUICK_HELP } from '@/data/content.js';
import { useSite } from '@/context/SiteContext.jsx';



export default function ContactPage() {
  const { user } = useAuth();
  const { branches } = useBranch();
  const { support } = useSite();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.full_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    subject: CONTACT_SUBJECTS[0],
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      await contentService.contact(form);
      setSent(true);
      toast.success('وصلتنا رسالتك');
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page-hero">
        <div className="container page-hero__inner page-hero__inner--single">
          <div>
            <span className="eyebrow">خدمة العملاء</span>
            <h1>نردّ على كل رسالة</h1>
            <p className="lede">
              متوسّط زمن الرد لدينا أقل من أربع ساعات في أيام العمل. وإن كان الأمر عاجلًا، اتصل بنا مباشرة.
            </p>
          </div>
        </div>
      </header>

      <div className="container section--tight">
        <div className="checkout-grid">
          <div className="panel">
            {sent ? (
              <div className="empty">
                <IconCheck size={44} style={{ color: 'var(--emerald)', margin: '0 auto var(--s-4)' }} />
                <h3>وصلتنا رسالتك</h3>
                <p>سنرد على <strong>{form.email}</strong> خلال يوم عمل واحد كحد أقصى.</p>
                <button type="button" className="btn btn--outline" style={{ marginTop: 'var(--s-4)' }} onClick={() => { setSent(false); setForm({ ...form, message: '' }); }}>
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>اكتب لنا</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s-3)' }}>
                  <Field label="الاسم" name="name" required error={errors.name} value={form.name} onChange={update('name')} />
                  <Field label="البريد الإلكتروني" name="email" type="email" required error={errors.email} value={form.email} onChange={update('email')} />
                  <Field label="رقم الهاتف" name="phone" error={errors.phone} value={form.phone} onChange={update('phone')} placeholder="01xxxxxxxxx" />
                  <Field label="الموضوع" name="subject" as="select" value={form.subject} onChange={update('subject')}>
                    {CONTACT_SUBJECTS.map((item) => <option key={item}>{item}</option>)}
                  </Field>
                </div>

                <Field
                  label="رسالتك" name="message" as="textarea" required
                  error={errors.message}
                  value={form.message}
                  onChange={update('message')}
                  placeholder="كلّما كانت التفاصيل أدقّ، كان ردّنا أسرع وأدقّ."
                />

                <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
                  {busy ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
                </button>
              </form>
            )}
          </div>

          <aside className="stack">
            <div className="panel">
              <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)' }}>تواصل مباشر</h3>
              <div className="branch-card__meta" style={{ fontSize: 'var(--t-sm)' }}>
                {support.phone && (
                  <div>
                    <IconPhone size={15} /> الخط الساخن{' '}
                    <a href={`tel:${support.phone}`} className="numeral" dir="ltr">{support.phone}</a>
                  </div>
                )}
                {support.email && (
                  <div>
                    <IconMail size={15} /> <a href={`mailto:${support.email}`} dir="ltr">{support.email}</a>
                  </div>
                )}
                <div><IconClock size={15} /> {SUPPORT_HOURS}</div>
              </div>
            </div>

            <div className="panel">
              <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)' }}>هواتف الفروع</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {branches.map((branch) => (
                  <a key={branch.id} href={`tel:${branch.phone}`} className="pdp__branch-row">
                    <span>{branch.name_ar}</span>
                    <span className="numeral muted">{branch.phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="section">
          <SectionHead eyebrow="قبل أن تكتب" title="ربما تجد إجابتك هنا" actionLabel="كل الأسئلة" actionTo="/about" />
          <div className="editorial">
            {QUICK_HELP.map(([title, note]) => (
              <div className="panel" key={title}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>{title}</strong>
                <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--s-2)' }}>{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
