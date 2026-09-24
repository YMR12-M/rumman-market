/**
 * المخزون في فرع واحد.
 *
 * مدير الفرع يفتحها على فرعه مباشرة ولا يستطيع تغييره — الخادم يفرض
 * ذلك أيضًا، فالاختيار هنا للمدير العام وحده.
 *
 * التعديل هنا **نسبي** لا مطلق: يُدخل الموظّف «وصل ٢٤» أو «تلف ٣»
 * بدل أن يعيد كتابة الرصيد. هذا يعطينا سجلّ حركة قابلًا للتدقيق
 * ويمنع فقدان تعديل موظّف آخر بالكتابة فوقه.
 */
import { useState } from 'react';
import DataTable from '@/components/admin/DataTable.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import Modal from '@/components/ui/Modal.jsx';
import {
  IconSearch, IconAlert, IconPlus, IconMinus, IconList, IconRefresh,
} from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync, useDebounce } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num, formatDateTime } from '@/lib/format.js';

const MOVEMENT_LABELS = {
  restock: 'توريد', sale: 'بيع', reserve: 'حجز', release: 'فكّ حجز',
  adjustment: 'تسوية', damage: 'هالك', return: 'مرتجع',
};

const ADJUST_TYPES = [
  { value: 'restock', label: 'توريد' },
  { value: 'return', label: 'مرتجع من عميل' },
  { value: 'damage', label: 'هالك أو تلف' },
  { value: 'adjustment', label: 'تسوية جرد' },
];

/* ── نافذة تعديل الرصيد ─────────────────────────────────────── */

function AdjustDialog({ row, branchId, onClose, onDone }) {
  const toast = useToast();
  const [type, setType] = useState('restock');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // التوريد والمرتجع يزيدان، والهالك ينقص، والتسوية قد تفعل الاثنين
  const sign = type === 'damage' ? -1 : 1;
  const parsed = Number(amount) || 0;
  const delta = type === 'adjustment' ? parsed : sign * Math.abs(parsed);
  const after = row.quantity + delta;

  const submit = async (event) => {
    event.preventDefault();
    if (delta === 0) { toast.error('أدخل كمية غير صفرية'); return; }

    setBusy(true);
    try {
      await adminService.inventory.adjust({
        branch_id: branchId,
        product_id: row.product_id,
        delta,
        type,
        note: note || undefined,
      });
      toast.success('تم تسجيل الحركة');
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="res-form">
      <div className="adjust-summary">
        <span>الرصيد الحالي</span>
        <strong className="numeral">{num(row.quantity)}</strong>
        <span aria-hidden="true">←</span>
        <strong className={`numeral ${after < 0 ? 'is-invalid' : ''}`}>{num(after)}</strong>
      </div>

      <div className="res-form__grid">
        <div className="res-form__cell" style={{ gridColumn: 'span 6' }}>
          <label className="field">
            <span className="field__label">نوع الحركة</span>
            <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
              {ADJUST_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <div className="res-form__cell" style={{ gridColumn: 'span 6' }}>
          <label className="field">
            <span className="field__label">
              الكمية {type === 'adjustment' && <span className="field__hint" style={{ display: 'inline' }}>(بالسالب للخصم)</span>}
            </span>
            <input
              type="number"
              className="input numeral"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
              required
            />
          </label>
        </div>

        <div className="res-form__cell" style={{ gridColumn: 'span 12' }}>
          <label className="field">
            <span className="field__label">ملاحظة</span>
            <input
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="رقم فاتورة التوريد، أو سبب الهالك…"
            />
          </label>
        </div>
      </div>

      {after < 0 && (
        <p className="field__error">الرصيد لا يمكن أن يصير سالبًا — الحدّ الأقصى للخصم {num(row.quantity)}.</p>
      )}

      <div className="res-form__actions">
        <button type="submit" className="btn btn--primary" disabled={busy || after < 0 || delta === 0}>
          {busy ? 'جارٍ التسجيل…' : 'تسجيل الحركة'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>إلغاء</button>
      </div>
    </form>
  );
}

/* ── سجلّ الحركة ────────────────────────────────────────────── */

function MovementsPanel({ row, branchId }) {
  const movements = useAsync(() => adminService.inventory.movements(branchId, row.product_id), [branchId, row.product_id]);

  return (
    <DataTable
      loading={movements.loading}
      rows={movements.data ?? []}
      rowKey={(_, index) => index}
      empty={{ title: 'لا حركات مسجّلة', description: 'كل تغيّر في الرصيد سيظهر هنا.' }}
      columns={[
        { key: 'type', label: 'النوع', render: (item) => MOVEMENT_LABELS[item.type] ?? item.type },
        {
          key: 'quantity', label: 'التغيّر', align: 'center',
          render: (item) => (
            <span className="numeral" style={{ color: item.quantity > 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
              {item.quantity > 0 ? '+' : ''}{num(item.quantity)}
            </span>
          ),
        },
        { key: 'balance_after', label: 'الرصيد', align: 'center', render: (item) => <span className="numeral">{num(item.balance_after)}</span> },
        { key: 'note', label: 'ملاحظة', hideOnMobile: true, render: (item) => item.note || '—' },
        {
          key: 'created_at', label: 'الوقت', hideOnMobile: true,
          render: (item) => (
            <div>
              <span className="cell-sub">{formatDateTime(item.created_at)}</span>
              {item.actor_name && <div className="cell-sub">{item.actor_name}</div>}
            </div>
          ),
        },
      ]}
    />
  );
}

/* ── الشاشة ─────────────────────────────────────────────────── */

export default function InventoryPage() {
  const { user, isAdmin } = useAuth();
  const branches = useAsync(() => adminService.branches.list(), []);

  const [branchId, setBranchId] = useState(isAdmin ? '' : String(user.default_branch_id ?? ''));
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const [adjusting, setAdjusting] = useState(null);
  const [history, setHistory] = useState(null);

  // أول فرع يُختار تلقائيًا للمدير العام — لا معنى لشاشة مخزون بلا فرع
  const effectiveBranch = branchId || branches.data?.[0]?.id || '';

  const stock = useAsync(
    () => (effectiveBranch
      ? adminService.inventory.list({
        branch_id: effectiveBranch,
        q: debounced || undefined,
        low: lowOnly ? '1' : undefined,
        page,
        limit: 25,
      })
      : Promise.resolve({ items: [], meta: null })),
    [effectiveBranch, debounced, lowOnly, page],
  );

  if (!branches.loading && (branches.data?.length ?? 0) === 0) {
    return (
      <section className="admin-page">
        <header className="admin-page__head">
          <h2 className="admin-page__title">المخزون</h2>
        </header>
        <div className="notice notice--warn">أضف فرعًا أولًا — المخزون يُسجَّل داخل فرع.</div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">المخزون</h2>
          <p className="admin-page__sub">
            التعديل نسبي (وصل / تلف / جرد) لا كتابةً فوق الرصيد — فيبقى لكل صنف سجلّ حركة كامل.
          </p>
        </div>

        <div className="admin-page__tools">
          {isAdmin && (
            <select
              className="select select--inline"
              value={effectiveBranch}
              onChange={(event) => { setBranchId(event.target.value); setPage(1); }}
            >
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => stock.reload()}>
            <IconRefresh size={14} /> تحديث
          </button>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <IconSearch size={17} />
          <input
            className="input"
            placeholder="ابحث باسم المنتج أو الكود…"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </div>

        <button
          type="button"
          className={`btn btn--sm ${lowOnly ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => { setLowOnly(!lowOnly); setPage(1); }}
        >
          <IconAlert size={14} /> ما يقترب من النفاد
        </button>
      </div>

      <DataTable
        loading={stock.loading}
        rows={stock.data?.items ?? []}
        empty={{
          title: lowOnly ? 'كل الأصناف فوق حدّ التنبيه' : 'لا أصناف في مخزون هذا الفرع',
          description: lowOnly
            ? 'لا شيء يحتاج توريدًا الآن.'
            : 'أدرِج المنتجات في هذا الفرع من شاشة «المنتجات» ← أيقونة المخزون.',
        }}
        columns={[
          {
            key: 'name_ar', label: 'المنتج',
            render: (row) => (
              <div className="cell-lead">
                <span className="cell-chip" style={{ background: `${row.category_accent}1f`, color: row.category_accent }} aria-hidden="true" />
                <div>
                  <strong>{row.name_ar}</strong>
                  <div className="cell-sub">
                    <span className="numeral" dir="ltr">{row.sku}</span>
                    {row.aisle && <> · ممر <span className="numeral" dir="ltr">{row.aisle}</span></>}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'available', label: 'المتاح', align: 'center',
            render: (row) => {
              const low = row.available <= row.low_stock_threshold;
              return (
                <div>
                  <strong className="numeral" style={{ color: row.available <= 0 ? 'var(--danger-text)' : low ? 'var(--warn-text)' : 'var(--text)' }}>
                    {num(row.available)}
                  </strong>
                  {row.reserved > 0 && <div className="cell-sub">محجوز {num(row.reserved)}</div>}
                </div>
              );
            },
          },
          { key: 'quantity', label: 'على الرفّ', align: 'center', hideOnMobile: true, render: (row) => <span className="numeral">{num(row.quantity)}</span> },
          { key: 'low_stock_threshold', label: 'حدّ التنبيه', align: 'center', hideOnMobile: true, render: (row) => <span className="numeral cell-sub">{num(row.low_stock_threshold)}</span> },
          {
            key: 'price', label: 'السعر', align: 'center', hideOnMobile: true,
            render: (row) => (
              <div>
                <span className="numeral">{money(row.price_override ?? row.price)}</span>
                {row.price_override != null && <div className="cell-sub">سعر الفرع</div>}
              </div>
            ),
          },
          {
            key: 'actions', label: '', align: 'end', width: 130,
            render: (row) => (
              <div className="row-actions">
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setAdjusting(row)} title="تعديل الرصيد" aria-label="تعديل الرصيد">
                  <IconPlus size={15} /><IconMinus size={15} style={{ marginInlineStart: -6 }} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => setHistory(row)} title="سجلّ الحركة" aria-label="سجلّ الحركة">
                  <IconList size={16} />
                </button>
              </div>
            ),
          },
        ]}
        footer={
          stock.data?.meta && stock.data.meta.totalPages > 1 && (
            <Pagination page={stock.data.meta.page} totalPages={stock.data.meta.totalPages} onChange={setPage} />
          )
        }
      />

      <Modal
        open={adjusting !== null}
        onClose={() => setAdjusting(null)}
        title="تعديل الرصيد"
        subtitle={adjusting?.name_ar}
        size="sm"
      >
        {adjusting && (
          <AdjustDialog
            row={adjusting}
            branchId={Number(effectiveBranch)}
            onClose={() => setAdjusting(null)}
            onDone={() => stock.reload()}
          />
        )}
      </Modal>

      <Modal
        open={history !== null}
        onClose={() => setHistory(null)}
        title="سجلّ الحركة"
        subtitle={history?.name_ar}
        size="md"
      >
        {history && <MovementsPanel row={history} branchId={Number(effectiveBranch)} />}
      </Modal>
    </section>
  );
}
