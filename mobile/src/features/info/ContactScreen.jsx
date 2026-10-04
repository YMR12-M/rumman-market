import { useState } from 'react';
import Screen from '@/components/shell/Screen.jsx';
import Field from '@/components/ui/Field.jsx';
import { EmptyState, SectionHead } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconChevronDown, IconClock, IconMail, IconPhone } from '@/lib/icons.jsx';
import { contentService } from '@/services/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useSite } from '@/context/SiteContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { CONTACT_SUBJECTS, QUICK_HELP, SUPPORT_HOURS } from '@/data/content.js';

/**
 * خدمة العملاء: اتصال بنقرة (الخط الساخن وهواتف الفروع من القاعدة)،
 * ثم أسئلة سريعة قد تغني عن الرسالة، ثم نموذج المراسلة.
 */
export default function ContactScreen() {
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
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

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
    <Screen title="خدمة العملاء" back="/account">
      {(support?.phone || support?.email) && (
        <div className="list">
          {support.phone && (
            <a href={`tel:${support.phone}`} className="list-row">
              <span className="list-row__icon"><IconPhone size={18} /></span>
              <span className="list-row__body">
                <span className="list-row__title">الخط الساخن</span>
                <span className="list-row__sub ltr" style={{ textAlign: 'end' }}>{support.phone}</span>
              </span>
            </a>
          )}
          {support.email && (
            <a href={`mailto:${support.email}`} className="list-row">
              <span className="list-row__icon"><IconMail size={18} /></span>
              <span className="list-row__body">
                <span className="list-row__title">البريد</span>
                <span className="list-row__sub ltr" style={{ textAlign: 'end' }}>{support.email}</span>
              </span>
            </a>
          )}
          <div className="list-row">
            <span className="list-row__icon"><IconClock size={18} /></span>
            <span className="list-row__body"><span className="list-row__title">{SUPPORT_HOURS}</span></span>
          </div>
        </div>
      )}

      {branches.some((branch) => branch.phone) && (
        <>
          <h2 className="list-caption">هواتف الفروع</h2>
          <div className="list">
            {branches.filter((branch) => branch.phone).map((branch) => (
              <a key={branch.id} href={`tel:${branch.phone}`} className="list-row">
                <span className="list-row__body"><span className="list-row__title">{branch.name_ar}</span></span>
                <span className="list-row__trail ltr">{branch.phone}</span>
              </a>
            ))}
          </div>
        </>
      )}

      <SectionHead title="قبل أن تكتب" />
      <div className="card" style={{ paddingInline: 'var(--s-4)' }}>
        {QUICK_HELP.map(([question, answer]) => (
          <details key={question} className="accordion">
            <summary>{question} <IconChevronDown size={18} /></summary>
            <p className="accordion__body">{answer}</p>
          </details>
        ))}
      </div>

      <SectionHead title="اكتب لنا" />
      {sent ? (
        <div className="card">
          <EmptyState
            icon={<IconCheck size={34} />}
            title="وصلتنا رسالتك"
            text={`سنردّ على ${form.email}.`}
            actionLabel="إرسال رسالة أخرى"
            onClick={() => { setSent(false); setForm((current) => ({ ...current, message: '' })); }}
          />
        </div>
      ) : (
        <form className="card card--pad" onSubmit={submit} noValidate>
          <Field label="الاسم" name="name" required autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
          <Field label="البريد الإلكتروني" name="email" type="email" required dir="ltr" inputMode="email" autoCapitalize="none" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
          <Field label="رقم الهاتف" name="phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={update('phone')} error={errors.phone} placeholder="01xxxxxxxxx" />
          <Field label="الموضوع" name="subject" as="select" value={form.subject} onChange={update('subject')}>
            {CONTACT_SUBJECTS.map((item) => <option key={item}>{item}</option>)}
          </Field>
          <Field
            label="رسالتك"
            name="message"
            as="textarea"
            required
            value={form.message}
            onChange={update('message')}
            error={errors.message}
            placeholder="كلّما كانت التفاصيل أدقّ، كان ردّنا أسرع."
          />
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !form.message.trim()}>
            {busy ? <span className="spinner" /> : 'إرسال الرسالة'}
          </button>
        </form>
      )}
    </Screen>
  );
}
