/**
 * المستخدمون.
 *
 * حارسان يفرضهما الخادم ونعرضهما هنا بوضوح:
 *  • لا يعدّل أحدٌ حسابه بنفسه من هذه الشاشة — يمنع رفع الصلاحية
 *    الذاتي وإيقاف نفسك بالخطأ.
 *  • آخر مدير نشط لا يُخفَّض ولا يُوقَف — وإلّا صار المتجر بلا مالك.
 */
import { useState } from 'react';
import DataTable from '@/components/admin/DataTable.jsx';
import ResourceForm from '@/components/admin/ResourceForm.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { IconPlus, IconEdit, IconSearch } from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync, useDebounce } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num, formatDate } from '@/lib/format.js';

const ROLE_LABELS = {
  customer: 'عميل',
  staff: 'فريق تجهيز',
  branch_manager: 'مدير فرع',
  admin: 'مدير المنصّة',
};

const ROLE_BADGE = {
  admin: 'badge--gold',
  branch_manager: 'badge--soft',
  staff: 'badge--outline',
  customer: 'badge--outline',
};

const TIER_LABELS = { silver: 'فضّي', gold: 'ذهبي', platinum: 'بلاتيني' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const branches = useAsync(() => adminService.branches.list(), []);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const users = useAsync(
    () => adminService.users.list({ q: debounced || undefined, role: role || undefined, page, limit: 25 }),
    [debounced, role, page],
  );

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const branchOptions = (branches.data ?? []).map((branch) => ({ value: branch.id, label: branch.name_ar }));

  const staffFields = [
    { name: 'full_name', label: 'الاسم الكامل', required: true, span: 6 },
    { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, span: 6, dir: 'ltr', autoComplete: 'off' },
    { name: 'phone', label: 'رقم الموبايل', required: true, span: 6, dir: 'ltr', placeholder: '01xxxxxxxxx' },
    { name: 'password', label: 'كلمة المرور', type: 'password', required: true, span: 6,
      hint: '10 أحرف على الأقل — سلّمها للموظّف ليغيّرها', autoComplete: 'new-password' },
    { name: 'role', label: 'الدور', type: 'select', required: true, span: 6,
      options: [
        { value: 'staff', label: 'فريق تجهيز — يحرّك حالة الطلبات' },
        { value: 'branch_manager', label: 'مدير فرع — مخزون ومدفوعات فرعه' },
        { value: 'admin', label: 'مدير المنصّة — كل الصلاحيات' },
      ] },
    { name: 'default_branch_id', label: 'الفرع', type: 'select', span: 6, options: branchOptions,
      hint: 'مطلوب لغير مدير المنصّة' },
  ];

  const editFields = [
    { name: 'full_name', label: 'الاسم الكامل', span: 12 },
    { name: 'role', label: 'الدور', type: 'select', span: 6,
      options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })) },
    { name: 'default_branch_id', label: 'الفرع', type: 'select', span: 6, options: branchOptions },
    { name: 'status', label: 'حالة الحساب', type: 'select', span: 6,
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'suspended', label: 'موقوف — تُبطَل جلساته فورًا' },
      ] },
  ];

  const createStaff = async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      await adminService.users.createStaff(payload);
      toast.success('تم إنشاء حساب الفريق');
      setCreating(false);
      users.reload();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      await adminService.users.update(editing.id, payload);
      toast.success('تم تحديث الحساب');
      setEditing(null);
      users.reload();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">المستخدمون</h2>
          <p className="admin-page__sub">
            العملاء يسجّلون أنفسهم. حسابات الفريق تُنشأ من هنا فقط — لا تسجيل ذاتي لأي دور إداري.
          </p>
        </div>
        <div className="admin-page__tools">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => { setErrors({}); setCreating(true); }}>
            <IconPlus size={15} /> حساب فريق
          </button>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <IconSearch size={17} />
          <input
            className="input"
            placeholder="ابحث بالاسم أو البريد أو الهاتف…"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </div>

        <select className="select select--inline" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
          <option value="">كل الأدوار</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <DataTable
        loading={users.loading}
        rows={users.data?.items ?? []}
        empty={{ title: 'لا حسابات مطابقة', description: 'جرّب بحثًا أو دورًا آخر.' }}
        columns={[
          {
            key: 'full_name', label: 'الحساب',
            render: (row) => (
              <div>
                <strong>{row.full_name}</strong>
                {row.id === me.id && <span className="badge badge--soft" style={{ marginInlineStart: 6 }}>أنت</span>}
                <div className="cell-sub" dir="ltr">{row.email}</div>
              </div>
            ),
          },
          {
            key: 'role', label: 'الدور', align: 'center',
            render: (row) => (
              <div>
                <span className={`badge ${ROLE_BADGE[row.role]}`}>{ROLE_LABELS[row.role]}</span>
                {row.branch_name && <div className="cell-sub">{row.branch_name}</div>}
              </div>
            ),
          },
          {
            key: 'orders_count', label: 'الطلبات', align: 'center', hideOnMobile: true,
            render: (row) => (
              <div>
                <span className="numeral">{num(row.orders_count)}</span>
                {Number(row.total_spent) > 0 && <div className="cell-sub numeral">{money(row.total_spent)}</div>}
              </div>
            ),
          },
          {
            key: 'loyalty_tier', label: 'الولاء', align: 'center', hideOnMobile: true,
            render: (row) => (row.role === 'customer' ? (
              <div>
                <span className="cell-sub">{TIER_LABELS[row.loyalty_tier] ?? '—'}</span>
                <div className="cell-sub numeral">{num(row.loyalty_points)} نقطة</div>
              </div>
            ) : '—'),
          },
          {
            key: 'created_at', label: 'انضمّ', hideOnMobile: true,
            render: (row) => <span className="cell-sub">{formatDate(row.created_at)}</span>,
          },
          {
            key: 'status', label: 'الحالة', align: 'center',
            render: (row) => (
              <span className={`badge ${row.status === 'active' ? 'badge--organic' : 'badge--sale'}`}>
                {row.status === 'active' ? 'نشط' : 'موقوف'}
              </span>
            ),
          },
          {
            key: 'actions', label: '', align: 'end', width: 60,
            render: (row) => (row.id === me.id ? (
              <span className="cell-sub" title="لا تُعدّل حسابك من هنا">—</span>
            ) : (
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => { setErrors({}); setEditing(row); }}
                title="تعديل"
                aria-label="تعديل الحساب"
              >
                <IconEdit size={16} />
              </button>
            )),
          },
        ]}
        footer={
          users.data?.meta && users.data.meta.totalPages > 1 && (
            <Pagination page={users.data.meta.page} totalPages={users.data.meta.totalPages} onChange={setPage} />
          )
        }
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="حساب فريق جديد"
        subtitle="الحساب يُفعَّل فورًا — سلّم كلمة المرور للموظّف وأخبره أن يغيّرها."
        size="md"
      >
        <ResourceForm
          fields={staffFields}
          errors={errors}
          busy={busy}
          submitLabel="إنشاء الحساب"
          onSubmit={createStaff}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="تعديل الحساب"
        subtitle={editing?.full_name}
        size="sm"
      >
        <ResourceForm
          fields={editFields}
          initial={editing}
          errors={errors}
          busy={busy}
          submitLabel="حفظ التعديلات"
          onSubmit={saveEdit}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </section>
  );
}
