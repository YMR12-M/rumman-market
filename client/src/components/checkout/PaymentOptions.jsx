import { IconWallet, IconTruck, IconCreditCard, IconCoins, IconInfo } from '@/lib/icons.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { paymentService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { money } from '@/lib/format.js';

/**
 * اختيار وسيلة الدفع.
 *
 * الوسائل تأتي من الخادم لا من قائمة في الكود — فما لم يُفعَّل في
 * `server/.env` لا يظهر أصلًا. هذا يمنع أسوأ خطأ ممكن هنا: أن يختار
 * عميلٌ وسيلةً غير جاهزة فيفشل طلبه بعد ملء كل شيء.
 *
 * المحفظة استثناء: ليست بوّابة خارجية بل رصيد داخلي، فتُعرض دائمًا
 * وتُعطَّل إن لم يكفِ الرصيد.
 */
const ICONS = {
  cod: IconTruck,
  instapay: IconCreditCard,
  fawry: IconCoins,
};

const COLORS = {
  cod: 'var(--gold-400)',
  instapay: 'var(--teal)',
  fawry: 'var(--violet)',
};

export default function PaymentOptions({ value, onChange, walletBalance = 0, dueAmount = 0 }) {
  const methods = useAsync(() => paymentService.methods(), []);

  const available = methods.data?.methods ?? [];
  const walletEnough = Number(walletBalance) >= Number(dueAmount);
  const selected = available.find((method) => method.key === value);

  return (
    <div className="panel">
      <h3 className="panel__title">طريقة الدفع</h3>

      {methods.loading && <Skeleton height={190} />}

      {!methods.loading && available.length === 0 && Number(walletBalance) <= 0 && (
        <p className="field__error">
          لا وسيلة دفع متاحة حاليًا. تواصل مع خدمة العملاء — لا تُكمل الطلب قبل ذلك.
        </p>
      )}

      {available.map((method) => {
        const Icon = ICONS[method.key] ?? IconCreditCard;
        return (
          <label key={method.key} className={`option-card${value === method.key ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="payment"
              checked={value === method.key}
              onChange={() => onChange(method.key)}
            />
            <Icon size={21} style={{ color: COLORS[method.key] ?? 'var(--brand)', flexShrink: 0 }} />
            <div>
              <div className="option-card__title">{method.label}</div>
              <div className="option-card__note">{method.note}</div>
            </div>
          </label>
        );
      })}

      {/* المحفظة تظهر فقط إن كان فيها رصيد — وإلّا فهي ضجيج */}
      {Number(walletBalance) > 0 && (
        <label
          className={`option-card${value === 'wallet' ? ' is-selected' : ''}`}
          style={walletEnough ? undefined : { opacity: 0.55 }}
        >
          <input
            type="radio"
            name="payment"
            checked={value === 'wallet'}
            onChange={() => onChange('wallet')}
            disabled={!walletEnough}
          />
          <IconWallet size={21} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <div>
            <div className="option-card__title">
              محفظتي <span className="numeral">({money(walletBalance)})</span>
            </div>
            <div className="option-card__note">
              {walletEnough ? 'خصم فوري من رصيدك — الطلب يتأكّد مباشرة' : 'الرصيد لا يكفي لهذا الطلب'}
            </div>
          </div>
        </label>
      )}

      {/* تعليمات إنستاباي تُعرض قبل التأكيد لا بعده — فيعرف ما ينتظره */}
      {selected?.key === 'instapay' && selected.instructions && (
        <div className="pay-hint">
          <IconInfo size={16} />
          <div>
            <strong>بعد تأكيد الطلب:</strong> حوّل <span className="numeral">{money(dueAmount)}</span> إلى
            {' '}<code dir="ltr">{selected.instructions.address}</code>
            {selected.instructions.account_name && <> باسم «{selected.instructions.account_name}»</>},
            ثم ارفع صورة الإيصال من صفحة الطلب. نراجعه ونبدأ التجهيز فور اعتماده.
          </div>
        </div>
      )}

      {selected?.key === 'fawry' && (
        <div className="pay-hint">
          <IconInfo size={16} />
          <div>
            <strong>بعد تأكيد الطلب:</strong> نعطيك كود دفع تسدّده من أي منفذ فوري أو من تطبيق myFawry.
            يبدأ التجهيز فور وصول إشعار الدفع.
          </div>
        </div>
      )}
    </div>
  );
}
