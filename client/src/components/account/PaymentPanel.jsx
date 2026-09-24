/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة الدفع في صفحة الطلب
 *
 *  كل وسيلة تترك العميل في موقفٍ مختلف، فتعرض اللوحة ما عليه فعله
 *  الآن بالضبط لا حالةً مجرّدة:
 *
 *   • كاش      → لا شيء. يُحصَّل عند التسليم.
 *   • إنستاباي → عنوان التحويل والمبلغ، ثم رفع الإيصال.
 *                وبعد الرفع: «نراجعه». وإن رُفض: السبب وإعادة الرفع.
 *   • فوري     → كود الدفع كبيرًا وقابلًا للنسخ، ومهلة صلاحيته.
 *
 *  القاعدة: لا نعرض «غير مدفوع» ونسكت. من رأى حالةً بلا خطوة تالية
 *  يتّصل بخدمة العملاء — وهذه مكالمة كان يمكن تفاديها بسطر.
 * ═══════════════════════════════════════════════════════════════
 */
import { useRef, useState } from 'react';
import {
  IconCreditCard, IconCoins, IconTruck, IconUpload, IconCheck,
  IconAlert, IconClock, IconFile,
} from '@/lib/icons.jsx';
import { paymentService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { money, formatDateTime, PAYMENT_STATUS_META } from '@/lib/format.js';

/** نسخ نصّ إلى الحافظة مع رجوع آمن إن مُنع الوصول */
async function copy(text, onDone) {
  try {
    await navigator.clipboard.writeText(text);
    onDone(true);
  } catch {
    onDone(false);
  }
}

export default function PaymentPanel({ order, onChanged }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [sender, setSender] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const payment = order.payment;
  const meta = PAYMENT_STATUS_META[order.payment_status] ?? { label: order.payment_status, tone: 'pending' };
  const closed = ['cancelled', 'refunded'].includes(order.status);
  const paid = order.payment_status === 'paid';

  const instructions = order.payment_instructions ?? null;

  /* ── الكاش: لا إجراء ──────────────────────────────────────── */
  if (order.payment_method === 'cod') {
    return (
      <div className="pay-panel">
        <div className="pay-panel__head">
          <IconTruck size={19} />
          <div>
            <strong>الدفع عند الاستلام</strong>
            <span className={`state state--${meta.tone}`}>{meta.label}</span>
          </div>
        </div>
        <p className="muted">
          {paid
            ? 'تم تحصيل المبلغ. شكرًا لك.'
            : <>جهّز <strong className="numeral">{money(order.grand_total)}</strong> عند الاستلام. لا حاجة لأي خطوة الآن.</>}
        </p>
      </div>
    );
  }

  /* ── المحفظة: مدفوع من الرصيد ────────────────────────────── */
  if (order.payment_method === 'wallet') {
    return (
      <div className="pay-panel">
        <div className="pay-panel__head">
          <IconCheck size={19} style={{ color: 'var(--success-text)' }} />
          <div>
            <strong>مدفوع من محفظتك</strong>
            <span className="state state--done">{money(order.grand_total)}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── فوري: كود الدفع ─────────────────────────────────────── */
  if (order.payment_method === 'fawry') {
    const code = payment?.fawry_reference ?? instructions?.reference_number;
    const expires = payment?.expires_at ?? instructions?.expires_at;

    return (
      <div className={`pay-panel${paid ? ' is-paid' : ''}`}>
        <div className="pay-panel__head">
          <IconCoins size={19} />
          <div>
            <strong>الدفع عبر فوري</strong>
            <span className={`state state--${meta.tone}`}>{meta.label}</span>
          </div>
        </div>

        {paid ? (
          <p className="muted">وصلنا إشعار الدفع من فوري وبدأ التجهيز.</p>
        ) : code ? (
          <>
            <button
              type="button"
              className="fawry-code"
              onClick={() => copy(code, (done) => toast[done ? 'success' : 'error'](done ? 'نُسخ الكود' : 'تعذّر النسخ — انسخه يدويًا'))}
              title="انقر لنسخ الكود"
            >
              <span className="fawry-code__label">كود الدفع</span>
              <strong className="fawry-code__value numeral" dir="ltr">{code}</strong>
              <span className="fawry-code__amount numeral">{money(order.grand_total)}</span>
            </button>

            <p className="muted">
              ادفع بهذا الكود من أي منفذ فوري أو من تطبيق myFawry.
              {expires && <> صالح حتى <span className="numeral">{formatDateTime(expires)}</span>.</>}
            </p>
          </>
        ) : (
          <p className="field__error">
            تعذّر إصدار كود الدفع. تواصل مع خدمة العملاء لتغيير وسيلة الدفع.
          </p>
        )}
      </div>
    );
  }

  /* ── إنستاباي: تحويل ثم إيصال ثم مراجعة ──────────────────── */
  const address = instructions?.address;
  const accountName = instructions?.account_name;
  const underReview = order.payment_status === 'under_review';
  const rejected = payment?.review_note && payment?.status === 'awaiting_proof';

  const submit = async (event) => {
    event.preventDefault();
    if (!file) { toast.error('اختر صورة الإيصال'); return; }

    setBusy(true);
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
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`pay-panel${paid ? ' is-paid' : ''}`}>
      <div className="pay-panel__head">
        <IconCreditCard size={19} />
        <div>
          <strong>الدفع عبر إنستاباي</strong>
          <span className={`state state--${meta.tone}`}>{meta.label}</span>
        </div>
      </div>

      {paid && <p className="muted">اعتمد فريقنا التحويل وبدأ التجهيز. شكرًا لك.</p>}

      {!paid && underReview && (
        <div className="pay-note pay-note--review">
          <IconClock size={16} />
          <div>
            <strong>نراجع إيصالك الآن.</strong>
            <p className="muted">
              المراجعة يدوية وتستغرق دقائق في ساعات العمل. سنُعلمك فور اعتماده
              {payment?.proof_uploaded_at && <> — رُفع {formatDateTime(payment.proof_uploaded_at)}</>}.
            </p>
          </div>
        </div>
      )}

      {!paid && rejected && (
        <div className="pay-note pay-note--reject">
          <IconAlert size={16} />
          <div>
            <strong>لم نتمكّن من مطابقة التحويل.</strong>
            <p className="muted">{payment.review_note}</p>
          </div>
        </div>
      )}

      {!paid && !underReview && !closed && (
        <>
          {address && (
            <button
              type="button"
              className="pay-address"
              onClick={() => copy(address, (done) => toast[done ? 'success' : 'error'](done ? 'نُسخ العنوان' : 'تعذّر النسخ — انسخه يدويًا'))}
              title="انقر لنسخ العنوان"
            >
              <span className="pay-address__label">حوّل إلى</span>
              <strong className="pay-address__value" dir="ltr">{address}</strong>
              {accountName && <span className="pay-address__owner">باسم: {accountName}</span>}
              <span className="pay-address__amount numeral">{money(order.grand_total)}</span>
            </button>
          )}

          <form onSubmit={submit} className="proof-form">
            <label className={`file-drop${file ? ' is-filled' : ''}`}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                hidden
              />
              {file ? <IconFile size={20} /> : <IconUpload size={20} />}
              <span>{file ? file.name : 'اختر صورة إيصال التحويل'}</span>
            </label>

            <div className="proof-form__row">
              <label className="field">
                <span className="field__label">اسم المحوِّل</span>
                <input
                  className="input"
                  value={sender}
                  onChange={(event) => setSender(event.target.value)}
                  placeholder="كما يظهر في التحويل"
                />
              </label>

              <label className="field">
                <span className="field__label">رقم العملية</span>
                <input
                  className="input numeral"
                  dir="ltr"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="من إيصال إنستاباي"
                />
              </label>
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={busy || !file}>
              {busy ? 'جارٍ الرفع…' : 'أرسل الإيصال للمراجعة'}
            </button>
            <p className="field__hint">
              كلّما كتبت اسم المحوِّل ورقم العملية، أسرعت المطابقة.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
