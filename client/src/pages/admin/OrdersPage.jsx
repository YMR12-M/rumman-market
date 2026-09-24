/**
 * الطلبات.
 * تصفية بالحالة وحالة الدفع والفرع، وبحث برقم الطلب أو باسم العميل
 * أو رقمه — لأن هذه هي الطريقة التي يسأل بها العميل على الهاتف.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '@/components/admin/DataTable.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { IconSearch, IconEye, IconRefresh } from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync, useDebounce } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  money, num, timeAgo, ORDER_STATUS_META, PAYMENT_STATUS_META, paymentLabel,
} from '@/lib/format.js';

const STATUSES = Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }));
const PAYMENT_STATES = Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }));

export default function OrdersPage() {
  const { isAdmin } = useAuth();
  const branches = useAsync(() => adminService.branches.list(), []);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const orders = useAsync(
    () => adminService.orders.list({
      q: debounced || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      branch_id: branchId || undefined,
      page,
      limit: 25,
    }),
    [debounced, status, paymentStatus, branchId, page],
  );

  const change = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">الطلبات</h2>
          <p className="admin-page__sub">
            {orders.data?.meta ? <><span className="numeral">{num(orders.data.meta.total)}</span> طلبًا</> : 'كل الطلبات'}
          </p>
        </div>
        <div className="admin-page__tools">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => orders.reload()}>
            <IconRefresh size={14} /> تحديث
          </button>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <IconSearch size={17} />
          <input
            className="input"
            placeholder="رقم الطلب، اسم العميل، أو رقم هاتفه…"
            value={search}
            onChange={change(setSearch)}
          />
        </div>

        {isAdmin && (branches.data?.length ?? 0) > 1 && (
          <select className="select select--inline" value={branchId} onChange={change(setBranchId)}>
            <option value="">كل الفروع</option>
            {branches.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
          </select>
        )}

        <select className="select select--inline" value={status} onChange={change(setStatus)}>
          <option value="">كل الحالات</option>
          {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>

        <select className="select select--inline" value={paymentStatus} onChange={change(setPaymentStatus)}>
          <option value="">كل حالات الدفع</option>
          {PAYMENT_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      <DataTable
        loading={orders.loading}
        rows={orders.data?.items ?? []}
        rowKey={(row) => row.order_number}
        empty={{
          title: debounced || status ? 'لا نتائج' : 'لا طلبات بعد',
          description: debounced || status ? 'جرّب تصفية أخرى.' : 'سيظهر كل طلب هنا لحظة إنشائه.',
        }}
        columns={[
          {
            key: 'order_number', label: 'الطلب',
            render: (row) => (
              <div>
                <strong className="numeral" dir="ltr">{row.order_number}</strong>
                <div className="cell-sub">
                  {timeAgo(row.placed_at)} · <span className="numeral">{num(row.items_count)}</span> صنفًا
                </div>
              </div>
            ),
          },
          {
            key: 'customer_name', label: 'العميل',
            render: (row) => (
              <div>
                <span>{row.customer_name}</span>
                <div className="cell-sub numeral" dir="ltr">{row.customer_phone}</div>
              </div>
            ),
          },
          { key: 'branch_name', label: 'الفرع', hideOnMobile: true, render: (row) => <span className="cell-sub">{row.branch_name}</span> },
          {
            key: 'status', label: 'الحالة', align: 'center',
            render: (row) => {
              const meta = ORDER_STATUS_META[row.status] ?? { label: row.status, tone: 'pending' };
              return <span className={`state state--${meta.tone}`}>{meta.label}</span>;
            },
          },
          {
            key: 'payment_status', label: 'الدفع', align: 'center',
            render: (row) => {
              const meta = PAYMENT_STATUS_META[row.payment_status] ?? { label: row.payment_status, tone: 'pending' };
              return (
                <div>
                  <span className={`state state--${meta.tone}`}>{meta.label}</span>
                  <div className="cell-sub">{paymentLabel(row.payment_method)}</div>
                </div>
              );
            },
          },
          {
            key: 'grand_total', label: 'الإجمالي', align: 'center',
            render: (row) => <strong className="numeral">{money(row.grand_total)}</strong>,
          },
          {
            key: 'actions', label: '', align: 'end', width: 60,
            render: (row) => (
              <Link
                to={`/account/orders/${row.order_number}`}
                className="icon-btn icon-btn--sm"
                title="تفاصيل الطلب"
                aria-label="تفاصيل الطلب"
              >
                <IconEye size={16} />
              </Link>
            ),
          },
        ]}
        footer={
          orders.data?.meta && orders.data.meta.totalPages > 1 && (
            <Pagination page={orders.data.meta.page} totalPages={orders.data.meta.totalPages} onChange={setPage} />
          )
        }
      />
    </section>
  );
}
