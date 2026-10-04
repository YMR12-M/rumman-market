/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة الدفع في صفحة الطلب
 *
 *  كل وسيلة تترك العميل في موقفٍ مختلف، فتعرض اللوحة ما عليه فعله
 *  الآن بالضبط لا حالةً مجرّدة — كما في الواجهة المكتبية:
 *
 *   • عند الاستلام → لا شيء. يُحصَّل عند التسليم.
 *   • المحفظة     → مدفوع من الرصيد.
 *   • فوري        → كود الدفع كبيرًا ويُنسخ بنقرة، ومهلة صلاحيته.
 *   • إنستاباي    → عنوان التحويل والمبلغ يُنسخان، ثم رفع صورة الإيصال
 *                    من المعرض أو الكاميرا مباشرة. بعد الرفع: «نراجعه».
 *                    وإن رُفض: السبب وإعادة الرفع.
 * ═══════════════════════════════════════════════════════════════
 */
import { useState } from 'react';
import Field from '@/components/ui/Field.jsx';
import { IconAlert, IconCheck, IconClock, IconCoins, IconCreditCard, IconFile, IconTruck } from '@/lib/icons.jsx';
import { IconCamera, IconCopy } from '@/lib/mobile-icons.jsx';
import { paymentService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { copyText } from '@/lib/device.js';
import { money, formatDateTime, PAYMENT_STATUS_META } from '@/lib/format.js';

export default function PaymentPanel({ order, onChanged }) {
  const toast = useToast();
  const [sender, setSender] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const payment = order.payment;
  const meta = PAYMENT_STATUS_META[order.payment_status] ?? { label: order.payment_status, tone: 'pending' };
  const closed = ['cancelled', 'refunded'].includes(order.status);
  const paid = order.payment_status === 'paid';
  const instructions = order.payment_instructions ?? null;

  const copy = async (text, label) => {
    const done = await copyText(text);
    if (done) toast.success(`نُسخ ${label}`);
    else toast.error('تعذّر النسخ — انسخه يدويًا');
  };

  const head = (Icon, title) => (
    <div className="pay__head">
      <Icon size={20} className="text-brand" />
      <div className="grow">
        <strong>{title}</strong>
      </div>
      <span className={`pill pill--${meta.tone}`}>{meta.label}</span>
    </div>
  );

  if (order.payment_method === 'cod') {
    return (
      <section className="card card--pad pay">
        {head(IconTruck, 'الدفع عند الاستلام')}
        <p className="text-sm soft">
          {paid ? 'تم تحصيل المبلغ. شكرًا لك.' : <>جهّز <strong className="ltr">{money(order.grand_total)}</strong> عند الاستلام. لا حاجة لأي خطوة الآن.</>}
        </p>
      </section>
    );
  }

  if (order.payment_method === 'wallet') {
    return (
      <section className="card card--pad pay">
        <div className="pay__head">
          <IconCheck size={20} className="text-success" />
          <div className="grow"><strong>مدفوع من محفظتك</strong></div>
          <strong className="ltr">{money(order.grand_total)}</strong>
        </div>
      </section>
    );
  }

  if (order.payment_method === 'fawry') {
    const code = payment?.fawry_reference ?? instructions?.reference_number;
    const expires = payment?.expires_at ?? instructions?.expires_at;

    return (
      <section className="card card--pad pay">
        {head(IconCoins, 'الدفع عبر فوري')}
        {paid ? (
          <p className="text-sm soft">وصلنا إشعار الدفع من فوري وبدأ التجهيز.</p>
        ) : closed ? null : code ? (
          <>
            <button type="button" className="pay__copy" onClick={() => copy(code, 'الكود')}>
              <span className="pay__copy-label">كود الدفع</span>
              <span className="pay__copy-value ltr">{code}</span>
              <span className="pay__copy-label">المبلغ <span className="ltr">{money(order.grand_total)}</span></span>
              <span className="pay__copy-hint row" style={{ justifyContent: 'center', gap: 4 }}><IconCopy size={14} /> اضغط للنسخ</span>
            </button>
            <p className="text-sm soft">
              ادفع بهذا الكود من أي منفذ فوري أو من تطبيق myFawry.
              {expires && <> صالح حتى <span className="numeral">{formatDateTime(expires)}</span>.</>}
            </p>
          </>
        ) : (
          <p className="notice notice--danger">تعذّر إصدار كود الدفع. تواصل مع خدمة العملاء لتغيير وسيلة الدفع.</p>
        )}
      </section>
    );
  }

  // ── إنستاباي ────────────────────────────────────────────────
  const address = instructions?.address;
  const accountName = instructions?.account_name;
  const underReview = order.payment_status === 'under_review';
  const rejected = Boolean(payment?.review_note) && payment?.status === 'awaiting_proof';

  const submit = async (event) => {
    event.preventDefault();
    if (!file) { toast.error('اختر صورة إيصال التحويل'); return; }
    setBusy(true);
    setErrors({});
    try {
      await paymentService.submitProof(order.order_number, file, {
        sender_name: sender.trim() || undefined,
        transfer_reference: reference.trim() || undefined,
      });
      toast.success('استلمنا الإيصال — نراجعه الآن');
      setFile(null);
      setSender('');
      setReference('');
      onChanged();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card card--pad pay">
      {head(IconCreditCard, 'الدفع عبر إنستاباي')}

      {paid && <p className="text-sm soft">اعتمد فريقنا التحويل وبدأ التجهيز. شكرًا لك.</p>}

      {!paid && underReview && (
        <div className="pay-note pay-note--review">
          <IconClock size={18} />
          <div>
            <strong>نراجع إيصالك الآن.</strong>
            <p>
              المراجعة يدوية وتستغرق دقائق في ساعات العمل، وسنُعلمك فور اعتماده
              {payment?.proof_uploaded_at && <> — رُفع {formatDateTime(payment.proof_uploaded_at)}</>}.
            </p>
          </div>
        </div>
      )}

      {!paid && rejected && (
        <div className="pay-note pay-note--reject">
          <IconAlert size={18} />
          <div>
            <strong>لم نتمكّن من مطابقة التحويل.</strong>
            <p>{payment.review_note}</p>
          </div>
        </div>
      )}

      {!paid && !underReview && !closed && (
        <>
          {address && (
            <button type="button" className="pay__copy" onClick={() => copy(address, 'عنوان التحويل')}>
              <span className="pay__copy-label">حوّل إلى</span>
              <span className="pay__copy-value ltr">{address}</span>
              {accountName && <span className="pay__copy-label">باسم: {accountName}</span>}
              <span className="pay__copy-label">المبلغ <strong className="ltr">{money(order.grand_total)}</strong></span>
              <span className="pay__copy-hint row" style={{ justifyContent: 'center', gap: 4 }}><IconCopy size={14} /> اضغط للنسخ</span>
            </button>
          )}

          <form onSubmit={submit} className="stack--tight" noValidate>
            <label className={`file-pick${file ? ' is-filled' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="visually-hidden"
              />
              {file ? <IconFile size={22} /> : <IconCamera size={22} />}
              <span>{file ? file.name : 'صوّر الإيصال أو اختره من المعرض'}</span>
            </label>

            <Field label="اسم المحوِّل" name="sender_name" value={sender} onChange={(event) => setSender(event.target.value)} placeholder="كما يظهر في التحويل" error={errors.sender_name} />
            <Field label="رقم العملية" name="transfer_reference" dir="ltr" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="من إيصال إنستاباي" error={errors.transfer_reference} />

            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !file}>
              {busy ? <span className="spinner" /> : 'أرسل الإيصال للمراجعة'}
            </button>
            <p className="field__hint">كلّما كتبت اسم المحوِّل ورقم العملية، أسرعت المطابقة.</p>
          </form>
        </>
      )}
    </section>
  );
}
