/**
 * المدفوعات.
 *
 * جوهر الشاشة: طابور تحويلات إنستاباي المنتظرة قرارًا بشريًا. لا شيء
 * يُعتبر مدفوعًا آليًا في إنستاباي — يفتح الموظّف الإيصال، يطابقه مع
 * المبلغ ورقم العملية، ثم يعتمد أو يرفض. القرار يُسجَّل باسمه ووقته.
 *
 * وتعرض الشاشة أيضًا حالة البوّابات نفسها، لأن «لا طلبات دفع إلكتروني»
 * قد يكون سببها بوّابةً غير مفعّلة لا ضعفًا في الطلب.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '@/components/admin/DataTable.jsx';
import Modal from '@/components/ui/Modal.jsx';
import {
  IconRefresh, IconCheck, IconClose, IconEye, IconExternal, IconAlert,
} from '@/lib/icons.jsx';
import { adminService, paymentService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, timeAgo } from '@/lib/format.js';

/* ── نافذة مراجعة إيصال ─────────────────────────────────────── */

function ReviewDialog({ row, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (approved) => {
    if (!approved && !note.trim()) {
      toast.error('اكتب سبب الرفض — سيراه العميل');
      return;
    }

    setBusy(true);
    try {
      await paymentService.reviewProof(row.order_number, approved, note.trim() || undefined);
      toast.success(approved ? 'تم اعتماد التحويل وبدأ التجهيز' : 'تم إبلاغ العميل بالرفض');
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <dl className="kv">
        <div><dt>المبلغ المستحقّ</dt><dd><strong className="numeral">{money(row.grand_total)}</strong></dd></div>
        <div><dt>العميل</dt><dd>{row.customer_name} · <span className="numeral" dir="ltr">{row.customer_phone}</span></dd></div>
        <div><dt>اسم المحوِّل</dt><dd>{row.sender_name || '— لم يُكتب —'}</dd></div>
        <div><dt>رقم العملية</dt><dd className="numeral" dir="ltr">{row.transaction_ref || '— لم يُكتب —'}</dd></div>
        <div><dt>وقت الرفع</dt><dd>{timeAgo(row.proof_uploaded_at)}</dd></div>
      </dl>

      {row.proof_url && (
        <figure className="proof">
          <a href={row.proof_url} target="_blank" rel="noreferrer noopener">
            <img src={row.proof_url} alt={`إيصال تحويل الطلب ${row.order_number}`} />
          </a>
          <figcaption>
            <a href={row.proof_url} target="_blank" rel="noreferrer noopener" className="link-underline">
              افتح الصورة بحجمها الكامل <IconExternal size={12} />
            </a>
          </figcaption>
        </figure>
      )}

      <label className="field">
        <span className="field__label">ملاحظة</span>
        <input
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="سبب الرفض إن رفضت — يظهر للعميل"
        />
      </label>

      <div className="res-form__actions">
        <button type="button" className="btn btn--primary" onClick={() => decide(true)} disabled={busy}>
          <IconCheck size={15} /> اعتماد التحويل
        </button>
        <button type="button" className="btn btn--danger" onClick={() => decide(false)} disabled={busy}>
          <IconClose size={15} /> رفض الإيصال
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>لاحقًا</button>
      </div>
    </div>
  );
}

/* ── الشاشة ─────────────────────────────────────────────────── */

export default function PaymentsPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const branches = useAsync(() => adminService.branches.list(), []);
  const [branchId, setBranchId] = useState(isAdmin ? '' : String(user.default_branch_id ?? ''));

  const methods = useAsync(() => paymentService.methods(), []);
  const health = useAsync(() => (isAdmin ? adminService.health() : Promise.resolve(null)), [isAdmin]);
  const queue = useAsync(() => paymentService.reviewQueue(branchId || undefined), [branchId]);

  const [reviewing, setReviewing] = useState(null);

  const enabled = methods.data?.methods ?? [];
  const gateways = health.data?.payments;

  const refreshFawry = async (orderNumber) => {
    try {
      const result = await paymentService.refreshFawry(orderNumber);
      toast.success(`حالة الدفع لدى فوري: ${result.status}`);
      queue.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">المدفوعات</h2>
          <p className="admin-page__sub">
            تحويلات إنستاباي تحتاج اعتمادًا بشريًا — لا يُعتبر أي طلب مدفوعًا حتى يعتمده أحدكم.
          </p>
        </div>
        <div className="admin-page__tools">
          {isAdmin && (branches.data?.length ?? 0) > 1 && (
            <select className="select select--inline" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">كل الفروع</option>
              {branches.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
            </select>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => queue.reload()}>
            <IconRefresh size={14} /> تحديث
          </button>
        </div>
      </header>

      {/* ── حالة البوّابات ─────────────────────────────────── */}
      {isAdmin && (
        <div className="gateways">
          {[
            ['cod', 'الدفع عند الاستلام', 'يُحصَّل لحظة التسليم'],
            ['instapay', 'إنستاباي', 'تحويل يعتمده الفريق'],
            ['fawry', 'فوري', gateways?.fawry_environment ? `بيئة: ${gateways.fawry_environment}` : 'كود دفع في أي منفذ'],
          ].map(([key, label, note]) => {
            const on = gateways ? gateways[key] : enabled.some((method) => method.key === key);
            return (
              <div key={key} className={`gateway${on ? ' is-on' : ''}`}>
                <span className="gateway__dot" aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <span className="gateway__note">{on ? note : 'غير مفعّل'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && enabled.length === 0 && (
        <div className="notice notice--danger">
          <IconAlert size={16} />
          لا وسيلة دفع مفعّلة — لن يتمكّن أي عميل من إتمام طلب. فعّلها من ملف <code>server/.env</code>.
        </div>
      )}

      {isAdmin && gateways?.fawry && gateways.fawry_environment === 'اختبار' && (
        <div className="notice notice--warn">
          فوري تعمل على بيئة الاختبار — لا تحصيل فعلي للأموال. غيّر <code>FAWRY_BASE_URL</code> قبل النشر.
        </div>
      )}

      {/* ── طابور المراجعة ────────────────────────────────── */}
      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">
            تحويلات تنتظر المراجعة
            {(queue.data?.length ?? 0) > 0 && <span className="badge badge--sale">{queue.data.length}</span>}
          </h3>
        </div>

        <DataTable
          loading={queue.loading}
          rows={queue.data ?? []}
          rowKey={(row) => row.payment_id}
          empty={{
            title: 'لا تحويلات تنتظر',
            description: 'كل الإيصالات المرفوعة تمّت مراجعتها.',
          }}
          columns={[
            {
              key: 'order_number', label: 'الطلب',
              render: (row) => (
                <div>
                  <Link to={`/account/orders/${row.order_number}`} className="link-underline numeral" dir="ltr">
                    {row.order_number}
                  </Link>
                  <div className="cell-sub">{row.branch_name}</div>
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
            {
              key: 'sender_name', label: 'المحوِّل', hideOnMobile: true,
              render: (row) => (
                <div>
                  <span>{row.sender_name || '—'}</span>
                  {row.transaction_ref && <div className="cell-sub numeral" dir="ltr">{row.transaction_ref}</div>}
                </div>
              ),
            },
            {
              key: 'grand_total', label: 'المبلغ', align: 'center',
              render: (row) => <strong className="numeral">{money(row.grand_total)}</strong>,
            },
            {
              key: 'proof_uploaded_at', label: 'مُنتظِر', align: 'center', hideOnMobile: true,
              render: (row) => <span className="cell-sub">{timeAgo(row.proof_uploaded_at)}</span>,
            },
            {
              key: 'actions', label: '', align: 'end', width: 120,
              render: (row) => (
                <div className="row-actions">
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setReviewing(row)}>
                    <IconEye size={14} /> راجع
                  </button>
                  {row.payment_method === 'fawry' && (
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => refreshFawry(row.order_number)} title="استعلم من فوري">
                      <IconRefresh size={15} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title="مراجعة تحويل إنستاباي"
        subtitle={reviewing?.order_number}
        size="md"
      >
        {reviewing && (
          <ReviewDialog row={reviewing} onClose={() => setReviewing(null)} onDone={() => queue.reload()} />
        )}
      </Modal>
    </section>
  );
}
