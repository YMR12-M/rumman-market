/**
 * ═══════════════════════════════════════════════════════════════
 *  شاشة إدارة كيان — جدول + نافذة تحرير + حذف
 *
 *  أربعة كيانات في اللوحة (الأقسام، العلامات، الكوبونات، العروض)
 *  تحتاج الشيء نفسه بالضبط. هذا المكوّن يبنيها من وصفٍ واحد، فيبقى
 *  سلوكها متطابقًا: نفس مكان زرّ الإضافة، نفس نصّ التأكيد، ونفس
 *  طريقة ربط أخطاء الخادم بالحقول.
 * ═══════════════════════════════════════════════════════════════
 */
import { useCallback, useState } from 'react';
import DataTable from './DataTable.jsx';
import ResourceForm from './ResourceForm.jsx';
import Modal, { ConfirmDialog } from '@/components/ui/Modal.jsx';
import { IconPlus, IconEdit, IconTrash } from '@/lib/icons.jsx';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';

export default function CrudPage({
  title,
  subtitle,
  singular,
  service,
  fields,
  columns,
  loader,
  addLabel,
  empty,
  modalSize = 'md',
  toolbar,
  rowActions,
  canDelete = () => true,
}) {
  const toast = useToast();
  const resource = useAsync(loader ?? (() => service.list()), []);

  const [editing, setEditing] = useState(null);   // null = مغلق، {} = جديد
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const rows = Array.isArray(resource.data) ? resource.data : (resource.data?.items ?? []);

  const save = useCallback(async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      if (editing?.id) {
        await service.update(editing.id, payload);
        toast.success(`تم تحديث ${singular}`);
      } else {
        await service.create(payload);
        toast.success(`تمت إضافة ${singular}`);
      }
      setEditing(null);
      resource.reload();
    } catch (error) {
      // أخطاء الحقول تعود من الخادم بمفاتيح أسماء الحقول
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, service, singular]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await service.remove(deleting.id);
      toast.success(`تم حذف ${singular}`);
      setDeleting(null);
      resource.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const allColumns = [
    ...columns,
    {
      key: '__actions',
      label: '',
      align: 'end',
      width: 110,
      render: (row) => (
        <div className="row-actions">
          {rowActions?.(row)}
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={() => { setErrors({}); setEditing(row); }}
            aria-label={`تعديل ${singular}`}
            title="تعديل"
          >
            <IconEdit size={16} />
          </button>
          {canDelete(row) && (
            <button
              type="button"
              className="icon-btn icon-btn--sm icon-btn--danger"
              onClick={() => setDeleting(row)}
              aria-label={`حذف ${singular}`}
              title="حذف"
            >
              <IconTrash size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">{title}</h2>
          {subtitle && <p className="admin-page__sub">{subtitle}</p>}
        </div>
        <div className="admin-page__tools">
          {toolbar}
          <button type="button" className="btn btn--primary btn--sm" onClick={() => { setErrors({}); setEditing({}); }}>
            <IconPlus size={15} /> {addLabel ?? `إضافة ${singular}`}
          </button>
        </div>
      </header>

      <DataTable
        columns={allColumns}
        rows={rows}
        loading={resource.loading}
        empty={{
          ...empty,
          actionLabel: empty?.actionLabel ?? `إضافة ${singular}`,
          onAction: () => setEditing({}),
        }}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `تعديل ${singular}` : `${singular} جديد`}
        subtitle={editing?.id ? (editing.name_ar || editing.title_ar || editing.code) : undefined}
        size={modalSize}
      >
        <ResourceForm
          fields={fields}
          initial={editing?.id ? editing : null}
          errors={errors}
          busy={busy}
          submitLabel={editing?.id ? 'حفظ التعديلات' : `إضافة ${singular}`}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title={`حذف ${singular}`}
        message={`سيُحذف «${deleting?.name_ar || deleting?.title_ar || deleting?.code || ''}». إن كان مرتبطًا ببيانات أخرى سنخبرك ولن يُحذف.`}
        confirmLabel="حذف"
      />
    </section>
  );
}
