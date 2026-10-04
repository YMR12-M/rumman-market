import Field from '@/components/ui/Field.jsx';
import { Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCoins, IconCreditCard, IconGift, IconInfo, IconTruck, IconWallet } from '@/lib/icons.jsx';
import { money, num } from '@/lib/format.js';

const METHOD_ICONS = { cod: IconTruck, instapay: IconCreditCard, fawry: IconCoins };
const METHOD_TONES = { cod: 'var(--lux-text)', instapay: 'var(--info-text)', fawry: 'var(--violet)' };

/**
 * ═══════════════════════════════════════════════════════════════
 *  الخطوة الثانية: الموعد، والدفع، والنقاط، والملاحظة
 *
 *  وسائل الدفع تأتي من الخادم لا من قائمة في الكود — فما لم يُفعَّل في
 *  إعدادات الخادم لا يظهر أصلًا، ولا يختار عميلٌ وسيلةً غير جاهزة
 *  فيفشل طلبه بعد ملء كل شيء. المحفظة رصيد داخلي، فتظهر متى كان فيها
 *  رصيد وتُعطَّل إن لم يكفِ.
 *
 *  وتعليمات إنستاباي وفوري تُعرض قبل التأكيد لا بعده — فيعرف العميل ما
 *  ينتظره قبل أن يلتزم.
 * ═══════════════════════════════════════════════════════════════
 */
export default function PaymentStep({
  fulfillment,
  days, slotDate, onSlotDateChange, slots, slotsLoading, slot, onSlotChange,
  methods, methodsLoading, payment, onPaymentChange, walletBalance, dueAmount,
  pointsBalance, maxPoints, usePoints, onUsePointsChange, pointsValue,
  note, onNoteChange,
}) {
  const walletEnough = Number(walletBalance) >= Number(dueAmount);
  const selected = methods.find((method) => method.key === payment);

  return (
    <div className="stack">
      {fulfillment === 'delivery' && (
        <section>
          <h2 className="card__title">موعد التوصيل</h2>
          <div className="chip-row" style={{ marginBlockEnd: 'var(--s-3)' }}>
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`chip${slotDate === day.value ? ' is-active' : ''}`}
                onClick={() => onSlotDateChange(day.value)}
                aria-pressed={slotDate === day.value}
              >
                {day.label}
              </button>
            ))}
          </div>

          {slotsLoading && <Skeleton height={140} />}

          {!slotsLoading && (slots?.length ?? 0) === 0 && (
            <p className="notice notice--warn">لا مواعيد متاحة في هذا اليوم — جرّب يومًا آخر.</p>
          )}

          <div className="slots" role="radiogroup" aria-label="شرائح التوصيل">
            {(slots ?? []).map((option) => (
              <button
                key={option.from}
                type="button"
                role="radio"
                aria-checked={slot?.from === option.from}
                className={`slot${slot?.from === option.from ? ' is-selected' : ''}`}
                disabled={!option.available}
                onClick={() => onSlotChange(option)}
              >
                <span>{option.label}</span>
                <span className="slot__time">{String(option.from).slice(0, 5)} — {String(option.to).slice(0, 5)}</span>
                <span className="slot__left">
                  {option.available
                    ? <><span className="numeral">{num(option.remaining)}</span> مكان متاح</>
                    : option.reason ?? 'مكتمل'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="card__title">طريقة الدفع</h2>

        {methodsLoading && <Skeleton height={150} />}

        {!methodsLoading && methods.length === 0 && Number(walletBalance) <= 0 && (
          <p className="notice notice--danger">
            لا وسيلة دفع متاحة حاليًا. تواصل مع خدمة العملاء — لا تُكمل الطلب قبل ذلك.
          </p>
        )}

        {methods.map((method) => {
          const Icon = METHOD_ICONS[method.key] ?? IconCreditCard;
          return (
            <label key={method.key} className={`option${payment === method.key ? ' is-selected' : ''}`}>
              <input type="radio" name="payment" checked={payment === method.key} onChange={() => onPaymentChange(method.key)} />
              <span className="option__icon" style={{ '--tone': METHOD_TONES[method.key] ?? 'var(--brand-text)' }}><Icon size={21} /></span>
              <span className="option__body">
                <span className="option__title">{method.label}</span>
                {method.note && <span className="option__note">{method.note}</span>}
              </span>
            </label>
          );
        })}

        {Number(walletBalance) > 0 && (
          <label className={`option${payment === 'wallet' ? ' is-selected' : ''}${walletEnough ? '' : ' is-disabled'}`}>
            <input type="radio" name="payment" checked={payment === 'wallet'} onChange={() => onPaymentChange('wallet')} disabled={!walletEnough} />
            <span className="option__icon"><IconWallet size={21} /></span>
            <span className="option__body">
              <span className="option__title">محفظتي (<span className="ltr">{money(walletBalance)}</span>)</span>
              <span className="option__note">{walletEnough ? 'خصم فوري من رصيدك — الطلب يتأكّد مباشرة' : 'الرصيد لا يكفي لهذا الطلب'}</span>
            </span>
          </label>
        )}

        {selected?.key === 'instapay' && selected.instructions && (
          <p className="notice notice--info" style={{ marginBlockStart: 'var(--s-3)' }}>
            <IconInfo size={16} />
            <span>
              <strong>بعد التأكيد:</strong> حوّل <span className="ltr">{money(dueAmount)}</span> إلى
              {' '}<span className="ltr">{selected.instructions.address}</span>
              {selected.instructions.account_name && <> باسم «{selected.instructions.account_name}»</>}،
              ثم ارفع صورة الإيصال من صفحة الطلب.
            </span>
          </p>
        )}

        {selected?.key === 'fawry' && (
          <p className="notice notice--info" style={{ marginBlockStart: 'var(--s-3)' }}>
            <IconInfo size={16} />
            <span><strong>بعد التأكيد:</strong> نعطيك كود دفع تسدّده من أي منفذ فوري أو من تطبيق myFawry، ويبدأ التجهيز فور وصول إشعار الدفع.</span>
          </p>
        )}
      </section>

      {maxPoints > 0 && (
        <section className="card card--pad">
          <h2 className="card__title row" style={{ gap: 'var(--s-2)' }}><IconGift size={18} className="text-brand" /> نقاط الولاء</h2>
          <p className="text-sm soft">
            لديك <strong className="numeral">{num(pointsBalance)}</strong> نقطة. يمكنك استخدام حتى <strong className="numeral">{num(maxPoints)}</strong> نقطة في هذا الطلب.
          </p>
          <input
            type="range"
            min="0"
            max={maxPoints}
            step={Math.min(10, maxPoints)}
            value={usePoints}
            onChange={(event) => onUsePointsChange(Number(event.target.value))}
            aria-label="عدد النقاط المستخدمة"
            style={{ width: '100%', accentColor: 'var(--brand)', marginBlock: 'var(--s-4)', minHeight: 'var(--tap)' }}
          />
          <div className="row row--between text-sm">
            <span><span className="numeral">{num(usePoints)}</span> نقطة</span>
            <strong className="text-success numeral ltr">−{money(pointsValue)}</strong>
          </div>
        </section>
      )}

      <Field
        label="ملاحظة للفرع (اختياري)"
        name="note"
        as="textarea"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        maxLength={500}
        placeholder="مثال: الفاكهة ناضجة من فضلك، أو اتصل قبل الوصول."
      />
    </div>
  );
}
