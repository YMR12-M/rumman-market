/**
 * الفروع.
 *
 * الفرع هو أهمّ كيان في النظام: السعر والمخزون ورسوم التوصيل ونطاق
 * التغطية كلها خصائصه. ولذلك تحصل هذه الشاشة على ما لا تحصل عليه
 * بقيّة الشاشات: تبويب لمواعيد العمل وآخر لمناطق التوصيل.
 *
 * الإحداثيات مطلوبة لأن اختيار «أقرب فرع» يُحسب بالمسافة الفعلية
 * (هافرساين) — فرعٌ بإحداثيات خاطئة لن يُقترح لأحد.
 */
import { useCallback, useState } from 'react';
import DataTable from '@/components/admin/DataTable.jsx';
import ResourceForm from '@/components/admin/ResourceForm.jsx';
import Modal, { ConfirmDialog } from '@/components/ui/Modal.jsx';
import { IconPlus, IconEdit, IconTrash, IconClock, IconTruck, IconExternal } from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const fields = [
  { name: 'name_ar', label: 'اسم الفرع', required: true, span: 6, group: 'التعريف' },
  { name: 'name_en', label: 'الاسم بالإنجليزية', required: true, span: 6, dir: 'ltr', group: 'التعريف' },
  { name: 'code', label: 'كود الفرع', required: true, span: 3, dir: 'ltr',
    hint: 'يظهر في رقم كل طلب', group: 'التعريف' },
  { name: 'slug', label: 'مُعرِّف الرابط', required: true, span: 3, dir: 'ltr', group: 'التعريف' },
  { name: 'phone', label: 'هاتف الفرع', required: true, span: 3, dir: 'ltr', group: 'التعريف' },
  { name: 'whatsapp', label: 'واتساب', span: 3, dir: 'ltr', group: 'التعريف' },
  { name: 'email', label: 'بريد الفرع', type: 'email', span: 6, dir: 'ltr', group: 'التعريف' },
  { name: 'tagline_ar', label: 'جملة تعريفية', span: 6, group: 'التعريف' },

  { name: 'address_ar', label: 'العنوان', required: true, span: 12, group: 'الموقع' },
  { name: 'address_en', label: 'العنوان بالإنجليزية', required: true, span: 12, dir: 'ltr', group: 'الموقع' },
  { name: 'city', label: 'المدينة', required: true, span: 6, group: 'الموقع' },
  { name: 'governorate', label: 'المحافظة', required: true, span: 6, group: 'الموقع' },
  { name: 'latitude', label: 'خط العرض', type: 'number', required: true, span: 6, step: 'any', dir: 'ltr',
    hint: 'من خرائط جوجل — يُستخدم لحساب أقرب فرع', group: 'الموقع' },
  { name: 'longitude', label: 'خط الطول', type: 'number', required: true, span: 6, step: 'any', dir: 'ltr', group: 'الموقع' },

  { name: 'delivery_fee', label: 'رسوم التوصيل', type: 'number', span: 4, min: 0, step: '0.01', group: 'التوصيل' },
  { name: 'free_delivery_over', label: 'توصيل مجاني فوق', type: 'number', span: 4, min: 0, step: '0.01',
    hint: 'صفر = لا توصيل مجاني', group: 'التوصيل' },
  { name: 'min_order_amount', label: 'أقلّ قيمة طلب', type: 'number', span: 4, min: 0, step: '0.01', group: 'التوصيل' },
  { name: 'delivery_radius_km', label: 'نطاق التوصيل (كم)', type: 'number', span: 4, min: 0.5, step: '0.5', group: 'التوصيل' },
  { name: 'avg_prep_minutes', label: 'متوسّط التجهيز (دقيقة)', type: 'number', span: 4, min: 5, group: 'التوصيل' },
  { name: 'supports_pickup', label: 'يدعم الاستلام من الفرع', type: 'switch', span: 4, group: 'التوصيل' },

  { name: 'opens_at', label: 'يفتح', type: 'time', span: 3, group: 'التشغيل' },
  { name: 'closes_at', label: 'يغلق', type: 'time', span: 3, group: 'التشغيل' },
  { name: 'is_24h', label: 'يعمل ٢٤ ساعة', type: 'switch', span: 6, group: 'التشغيل' },
  { name: 'area_sqm', label: 'المساحة (م²)', type: 'number', span: 3, min: 0, group: 'التشغيل' },
  { name: 'opened_year', label: 'سنة الافتتاح', type: 'number', span: 3, min: 1900, max: 2100, group: 'التشغيل' },
  { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active', group: 'التشغيل',
    options: [
      { value: 'active', label: 'يعمل' },
      { value: 'maintenance', label: 'صيانة — لا يستقبل طلبات' },
      { value: 'closed', label: 'مغلق' },
    ] },
];

const STATUS = {
  active: ['badge--organic', 'يعمل'],
  maintenance: ['badge--gold', 'صيانة'],
  closed: ['badge--outline', 'مغلق'],
};

/* ── تبويب مواعيد العمل ──────────────────────────────────────── */

function HoursPanel({ branch, onClose }) {
  const toast = useToast();
  const saved = useAsync(() => adminService.branches.hours(branch.id), [branch.id]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);

  const rows = draft ?? (saved.data?.length
    ? WEEKDAYS.map((_, weekday) => {
      const found = saved.data.find((day) => Number(day.weekday) === weekday);
      return found
        ? { weekday, open_time: String(found.open_time).slice(0, 5), close_time: String(found.close_time).slice(0, 5), is_closed: Boolean(found.is_closed) }
        : { weekday, open_time: String(branch.opens_at).slice(0, 5), close_time: String(branch.closes_at).slice(0, 5), is_closed: false };
    })
    : WEEKDAYS.map((_, weekday) => ({
      weekday,
      open_time: String(branch.opens_at).slice(0, 5),
      close_time: String(branch.closes_at).slice(0, 5),
      is_closed: false,
    })));

  const patch = (weekday, changes) =>
    setDraft(rows.map((row) => (row.weekday === weekday ? { ...row, ...changes } : row)));

  const save = async () => {
    setBusy(true);
    try {
      await adminService.branches.replaceHours(branch.id, rows);
      toast.success('تم تحديث مواعيد العمل');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        هذه المواعيد تسبق مواعيد الفرع العامّة. اليوم المُعلَّم «مغلق» لا يستقبل طلبات.
      </p>

      <div className="hours">
        {rows.map((row) => (
          <div key={row.weekday} className={`hours__row${row.is_closed ? ' is-closed' : ''}`}>
            <span className="hours__day">{WEEKDAYS[row.weekday]}</span>

            <input
              type="time"
              className="input input--sm"
              value={row.open_time}
              disabled={row.is_closed}
              onChange={(event) => patch(row.weekday, { open_time: event.target.value })}
              aria-label={`وقت فتح ${WEEKDAYS[row.weekday]}`}
            />
            <span className="hours__dash">—</span>
            <input
              type="time"
              className="input input--sm"
              value={row.close_time}
              disabled={row.is_closed}
              onChange={(event) => patch(row.weekday, { close_time: event.target.value })}
              aria-label={`وقت غلق ${WEEKDAYS[row.weekday]}`}
            />

            <label className="checkbox hours__closed">
              <input
                type="checkbox"
                checked={row.is_closed}
                onChange={(event) => patch(row.weekday, { is_closed: event.target.checked })}
              />
              <span>مغلق</span>
            </label>
          </div>
        ))}
      </div>

      <div className="res-form__actions">
        <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ المواعيد'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>إلغاء</button>
      </div>
    </div>
  );
}

/* ── تبويب مناطق التوصيل ────────────────────────────────────── */

const zoneFields = [
  { name: 'name_ar', label: 'اسم المنطقة', required: true, span: 6 },
  { name: 'name_en', label: 'الاسم بالإنجليزية', required: true, span: 6, dir: 'ltr' },
  { name: 'delivery_fee', label: 'رسوم التوصيل', type: 'number', span: 4, min: 0, step: '0.01' },
  { name: 'min_order', label: 'أقلّ قيمة طلب', type: 'number', span: 4, min: 0, step: '0.01' },
  { name: 'eta_minutes', label: 'مدّة التوصيل (دقيقة)', type: 'number', span: 4, min: 5 },
  { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active',
    options: [{ value: 'active', label: 'نشطة' }, { value: 'paused', label: 'موقوفة' }] },
];

function ZonesPanel({ branch }) {
  const toast = useToast();
  const zones = useAsync(() => adminService.branches.zones(branch.id), [branch.id]);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      if (editing?.id) await adminService.branches.updateZone(editing.id, payload);
      else await adminService.branches.addZone(branch.id, payload);
      toast.success('تم الحفظ');
      setEditing(null);
      zones.reload();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (zone) => {
    try {
      await adminService.branches.removeZone(zone.id);
      toast.success('تم حذف المنطقة');
      zones.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        رسوم مخصّصة لكل منطقة داخل نطاق الفرع. بلا مناطق تُطبَّق رسوم الفرع العامّة.
      </p>

      <DataTable
        loading={zones.loading}
        rows={zones.data ?? []}
        empty={{ title: 'لا مناطق مخصّصة', description: 'رسوم الفرع العامّة تُطبَّق على كل العناوين داخل النطاق.' }}
        columns={[
          { key: 'name_ar', label: 'المنطقة', render: (row) => <strong>{row.name_ar}</strong> },
          { key: 'delivery_fee', label: 'الرسوم', render: (row) => <span className="numeral">{money(row.delivery_fee)}</span> },
          { key: 'eta_minutes', label: 'المدّة', render: (row) => <span className="numeral">{num(row.eta_minutes)} د</span> },
          {
            key: 'actions', label: '', align: 'end',
            render: (row) => (
              <div className="row-actions">
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setEditing(row)} aria-label="تعديل">
                  <IconEdit size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => remove(row)} aria-label="حذف">
                  <IconTrash size={15} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: 'var(--s-4)' }} onClick={() => { setErrors({}); setEditing({}); }}>
        <IconPlus size={14} /> إضافة منطقة
      </button>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل منطقة' : 'منطقة توصيل جديدة'}
        size="sm"
      >
        <ResourceForm
          fields={zoneFields}
          initial={editing?.id ? editing : null}
          errors={errors}
          busy={busy}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}

/* ── الشاشة ─────────────────────────────────────────────────── */

export default function BranchesPage() {
  const toast = useToast();
  const branches = useAsync(() => adminService.branches.list(), []);

  const [editing, setEditing] = useState(null);
  const [hours, setHours] = useState(null);
  const [zones, setZones] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = useCallback(async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      if (editing?.id) await adminService.branches.update(editing.id, payload);
      else await adminService.branches.create(payload);
      toast.success(editing?.id ? 'تم تحديث الفرع' : 'تمت إضافة الفرع');
      setEditing(null);
      branches.reload();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminService.branches.remove(deleting.id);
      toast.success('تم حذف الفرع');
      setDeleting(null);
      branches.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">الفروع</h2>
          <p className="admin-page__sub">
            لكل فرع سعره ومخزونه ورسومه ونطاقه. الإحداثيات تُحدّد أي فرع يُقترح لكل عميل.
          </p>
        </div>
        <div className="admin-page__tools">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => { setErrors({}); setEditing({}); }}>
            <IconPlus size={15} /> إضافة فرع
          </button>
        </div>
      </header>

      <DataTable
        loading={branches.loading}
        rows={branches.data ?? []}
        empty={{
          title: 'لا فروع بعد',
          description: 'الفرع هو أوّل ما يحتاجه المتجر — منه يأتي السعر والمخزون ورسوم التوصيل.',
          actionLabel: 'إضافة أول فرع',
          onAction: () => setEditing({}),
        }}
        columns={[
          {
            key: 'name_ar', label: 'الفرع',
            render: (row) => (
              <div>
                <strong>{row.name_ar}</strong>
                <div className="cell-sub">
                  <span className="numeral" dir="ltr">{row.code}</span> · {row.city}
                </div>
              </div>
            ),
          },
          {
            key: 'products_count', label: 'أصناف', align: 'center', hideOnMobile: true,
            render: (row) => (
              <div>
                <span className="numeral">{num(row.products_count)}</span>
                {row.low_stock_count > 0 && (
                  <div className="cell-sub" style={{ color: 'var(--warn-text)' }}>
                    {num(row.low_stock_count)} ينفد
                  </div>
                )}
              </div>
            ),
          },
          { key: 'orders_count', label: 'طلبات', align: 'center', hideOnMobile: true,
            render: (row) => <span className="numeral">{num(row.orders_count)}</span> },
          {
            key: 'delivery_fee', label: 'التوصيل', hideOnMobile: true,
            render: (row) => (
              <div>
                <span className="numeral">{money(row.delivery_fee)}</span>
                {Number(row.free_delivery_over) > 0 && (
                  <div className="cell-sub">مجانًا فوق {money(row.free_delivery_over)}</div>
                )}
              </div>
            ),
          },
          {
            key: 'status', label: 'الحالة', align: 'center',
            render: (row) => {
              const [cls, label] = STATUS[row.status] ?? STATUS.closed;
              return <span className={`badge ${cls}`}>{label}</span>;
            },
          },
          {
            key: 'actions', label: '', align: 'end', width: 160,
            render: (row) => (
              <div className="row-actions">
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setHours(row)} title="مواعيد العمل" aria-label="مواعيد العمل">
                  <IconClock size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setZones(row)} title="مناطق التوصيل" aria-label="مناطق التوصيل">
                  <IconTruck size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => { setErrors({}); setEditing(row); }} title="تعديل" aria-label="تعديل">
                  <IconEdit size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => setDeleting(row)} title="حذف" aria-label="حذف">
                  <IconTrash size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل الفرع' : 'فرع جديد'}
        subtitle={editing?.id ? editing.name_ar : 'الإحداثيات من خرائط جوجل: انقر المكان بالزرّ الأيمن وانسخ الرقمين.'}
        size="lg"
      >
        <ResourceForm
          fields={fields}
          initial={editing?.id ? editing : null}
          errors={errors}
          busy={busy}
          submitLabel={editing?.id ? 'حفظ التعديلات' : 'إضافة الفرع'}
          onSubmit={save}
          onCancel={() => setEditing(null)}
          extra={
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer noopener"
              className="link-underline"
              style={{ fontSize: 'var(--t-xs)' }}
            >
              افتح خرائط جوجل لنسخ الإحداثيات <IconExternal size={12} />
            </a>
          }
        />
      </Modal>

      <Modal open={hours !== null} onClose={() => setHours(null)} title="مواعيد العمل" subtitle={hours?.name_ar} size="md">
        {hours && <HoursPanel branch={hours} onClose={() => setHours(null)} />}
      </Modal>

      <Modal open={zones !== null} onClose={() => setZones(null)} title="مناطق التوصيل" subtitle={zones?.name_ar} size="md">
        {zones && <ZonesPanel branch={zones} />}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="حذف الفرع"
        message={`سيُخفى «${deleting?.name_ar ?? ''}» من المتجر. طلباته ومخزونه يبقيان محفوظين في السجلّات.`}
        confirmLabel="حذف الفرع"
      />
    </section>
  );
}
