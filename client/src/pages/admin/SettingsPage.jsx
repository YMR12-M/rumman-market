/**
 * الإعدادات.
 *
 * جزآن مختلفان جوهريًا:
 *  • إعدادات **قابلة للتحرير** من اللوحة (اسم العلامة، بيانات
 *    الاتصال، قواعد الولاء) — تُحفَظ في قاعدة البيانات.
 *  • إعدادات **البيئة** (مفاتيح الدفع والبريد) — تُعرض للقراءة فقط.
 *    لأن الأسرار لا تسكن قاعدة بيانات تُقرأ من الويب، ولا تُحرَّر من
 *    متصفّح. مكانها ملف `.env` على الخادم.
 */
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { IconCheck, IconAlert, IconRefresh } from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDateTime } from '@/lib/format.js';

/** ترجمة المفاتيح إلى تسميات عربية ووصف — ما ليس هنا يُعرض بمفتاحه */
const LABELS = {
  brand_name_ar: ['اسم العلامة', 'يظهر في الموقع والبريد'],
  brand_tagline: ['الجملة التعريفية', 'تحت الشعار وفي تذييل البريد'],
  support_phone: ['هاتف خدمة العملاء', 'يظهر في التذييل وكل رسالة'],
  support_email: ['بريد خدمة العملاء', 'يستقبل ردود العملاء'],
  points_per_egp: ['نقاط لكل جنيه', 'كم نقطة يكسب العميل لكل جنيه'],
  point_value_egp: ['قيمة النقطة بالجنيه', '0.05 يعني كل 20 نقطة = جنيه'],
  max_points_redemption_percent: ['أقصى نسبة دفع بالنقاط', 'من قيمة السلة — 50 يعني نصفها'],
  default_tax_rate: ['نسبة الضريبة الافتراضية', 'للمنتجات التي لم تُحدَّد ضريبتها'],
  currency_code: ['رمز العملة', 'EGP'],
  store_status: ['حالة المتجر', 'open = يستقبل الطلبات · closed = يوقفها'],
};

const GROUP_LABELS = {
  brand: 'العلامة',
  contact: 'التواصل',
  loyalty: 'الولاء والنقاط',
  finance: 'المالية',
  general: 'عامّ',
};

export default function SettingsPage() {
  const toast = useToast();
  const settings = useAsync(() => adminService.settings.all(), []);
  const health = useAsync(() => adminService.health(), []);

  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => Object.entries(settings.data ?? {}), [settings.data]);

  const valueOf = (item) => (draft[item.key] !== undefined ? draft[item.key] : item.value);
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    const changed = groups.flatMap(([group, items]) =>
      items
        .filter((item) => draft[item.key] !== undefined && draft[item.key] !== item.value)
        .map((item) => ({ key: item.key, value: String(draft[item.key]), group })));

    if (changed.length === 0) { setDraft({}); return; }

    setBusy(true);
    try {
      await adminService.settings.save(changed);
      toast.success('تم حفظ الإعدادات');
      setDraft({});
      settings.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const env = health.data;

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">الإعدادات</h2>
          <p className="admin-page__sub">
            ما يمكن تحريره من هنا يُحفَظ في قاعدة البيانات. مفاتيح الدفع والبريد تبقى في ملف الخادم — لا تُقرأ ولا تُكتب من المتصفّح.
          </p>
        </div>
        {dirty && (
          <div className="admin-page__tools">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft({})} disabled={busy}>
              <IconRefresh size={14} /> تراجع
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={busy}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
            </button>
          </div>
        )}
      </header>

      {/* ── إعدادات قابلة للتحرير ─────────────────────────── */}
      {settings.loading ? <Skeleton height={280} /> : groups.map(([group, items]) => (
        <div key={group} className="panel">
          <h3 className="panel__title">{GROUP_LABELS[group] ?? group}</h3>

          <div className="settings-grid">
            {items.map((item) => {
              const [label, note] = LABELS[item.key] ?? [item.key, null];
              return (
                <label key={item.key} className="field">
                  <span className="field__label">{label}</span>
                  <input
                    className={`input${/points|value|rate|percent/.test(item.key) ? ' numeral' : ''}`}
                    value={valueOf(item)}
                    onChange={(event) => setDraft({ ...draft, [item.key]: event.target.value })}
                    dir={/email|code|status/.test(item.key) ? 'ltr' : undefined}
                  />
                  {note && <span className="field__hint">{note}</span>}
                  <span className="field__hint settings-key" dir="ltr">{item.key} · حُدّث {formatDateTime(item.updated_at)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── إعدادات البيئة للقراءة ────────────────────────── */}
      <div className="panel">
        <h3 className="panel__title">الخدمات الخارجية</h3>
        <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
          تُضبَط في <code dir="ltr">server/.env</code> ثم يُعاد تشغيل الخادم. تُعرض هنا للتحقّق قبل النشر.
        </p>

        {health.loading ? <Skeleton height={160} /> : env && (
          <div className="env-grid">
            <EnvRow
              ok={env.mail.configured}
              label="البريد الإلكتروني"
              value={env.mail.configured ? `Resend · ${env.mail.from}` : 'غير مضبوط — الرسائل تُكتب في سجلّ الخادم فقط'}
              fix="RESEND_API_KEY"
            />
            <EnvRow ok={env.payments.cod} label="الدفع عند الاستلام" value={env.payments.cod ? 'مفعّل' : 'معطّل'} fix="PAY_COD_ENABLED" />
            <EnvRow ok={env.payments.instapay} label="إنستاباي" value={env.payments.instapay ? 'مفعّل' : 'معطّل أو بلا عنوان تحويل'} fix="PAY_INSTAPAY_ENABLED · INSTAPAY_ADDRESS" />
            <EnvRow
              ok={env.payments.fawry}
              label="فوري"
              value={env.payments.fawry ? `مفعّل · بيئة ${env.payments.fawry_environment}` : 'معطّل'}
              fix="PAY_FAWRY_ENABLED · FAWRY_MERCHANT_CODE"
              warn={env.payments.fawry && env.payments.fawry_environment === 'اختبار'}
            />
            <EnvRow ok label="رابط الواجهة" value={env.app_url} fix="APP_URL" />
            <EnvRow ok label="رابط الـ API العام" value={env.api_public_url} fix="API_PUBLIC_URL — تحتاجه فوري لإشعار الدفع" />
            <EnvRow
              ok={env.environment === 'production'}
              label="بيئة التشغيل"
              value={env.environment === 'production' ? 'إنتاج' : `تطوير (${env.environment})`}
              fix="NODE_ENV"
              warn={env.environment !== 'production'}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function EnvRow({ ok, warn, label, value, fix }) {
  const tone = warn ? 'is-warn' : ok ? 'is-ok' : 'is-off';
  return (
    <div className={`env-row ${tone}`}>
      <span className="env-row__icon">{ok && !warn ? <IconCheck size={15} /> : <IconAlert size={15} />}</span>
      <div className="env-row__body">
        <strong>{label}</strong>
        <span className="env-row__value" dir="auto">{value}</span>
        <code className="env-row__key" dir="ltr">{fix}</code>
      </div>
    </div>
  );
}
