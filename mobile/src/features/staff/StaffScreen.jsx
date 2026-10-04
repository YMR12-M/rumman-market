import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import Sheet from '@/components/ui/Sheet.jsx';
import Field from '@/components/ui/Field.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconChevronLeft, IconClose, IconExternal, IconPhone, IconSearch } from '@/lib/icons.jsx';
import { analyticsService, orderService, paymentService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num, timeAgo, ORDER_STATUS_META } from '@/lib/format.js';
import { ACTION_LABELS, NEEDS_REASON, atLeast, nextStatuses } from './transitions.js';

/** كل كم يُعاد جلب الطابور والشاشة ظاهرة — الطلبات تصل والموظّف يعمل */
const REFRESH_MS = 45_000;

/**
 * ═══════════════════════════════════════════════════════════════
 *  لوحة الفرع — ما يحتاجه الفريق على أرض المتجر، لا لوحة الإدارة كلّها
 *
 *  • الطابور: الطلبات المفتوحة الأقدم أولًا، وتحريك كل طلب إلى مرحلته
 *    التالية بنقرة. الإلغاء يُفتح من صفحة الطلب لأنه يحتاج سببًا.
 *  • التحويلات: إيصالات إنستاباي المنتظرة قرارًا بشريًا — صورة الإيصال
 *    بجانب المبلغ واسم المحوِّل، ثم اعتماد أو رفض بسبب يراه العميل.
 *  • فتح طلب برقمه: لكل موظّف، لأن العميل يسأل على الهاتف برقم طلبه.
 *
 *  الطابور والتحويلات لمدير الفرع فما فوق، كما في الخادم؛ ومدير الفرع
 *  يرى فرعه وحده. الإدارة الثقيلة (المنتجات، الاستيراد، الإعدادات) تبقى
 *  في الواجهة المكتبية حيث تتّسع لها الشاشة.
 * ═══════════════════════════════════════════════════════════════
 */
export default function StaffScreen() {
  const { user } = useAuth();
  const manager = atLeast(user, 'branch_manager');
  const [tab, setTab] = useState(manager ? 'queue' : 'lookup');

  const tabs = [
    manager && ['queue', 'الطابور'],
    manager && ['transfers', 'التحويلات'],
    ['lookup', 'فتح طلب'],
  ].filter(Boolean);

  return (
    <Screen title="لوحة الفرع" subtitle={user?.full_name} back="/account">
      {tabs.length > 1 && (
        <div className="segmented" role="tablist" style={{ marginBlockEnd: 'var(--s-4)' }}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`segmented__btn${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'queue' && manager && <Queue />}
      {tab === 'transfers' && manager && <Transfers />}
      {tab === 'lookup' && <Lookup />}
    </Screen>
  );
}

/** الفرع الذي تعمل عليه اللوحة: فرع المدير نفسه، أو المختار للمدير العام */
function useStaffBranch() {
  const { user } = useAuth();
  const { branchId, branch, branches } = useBranch();
  if (user?.role === 'admin') return { id: branchId, name: branch?.name_ar };
  const own = branches.find((item) => item.id === user?.default_branch_id);
  return { id: user?.default_branch_id ?? null, name: own?.name_ar };
}

/** يعيد تشغيل الدالة دوريًا ما دامت الشاشة ظاهرة، وفور العودة إليها */
function useLiveReload(reload) {
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [reload]);
}

function Queue() {
  const toast = useToast();
  const staffBranch = useStaffBranch();
  const [busy, setBusy] = useState(null);

  const queue = useAsync(
    () => (staffBranch.id ? analyticsService.queue(staffBranch.id) : Promise.resolve([])),
    [staffBranch.id],
  );
  useLiveReload(queue.reload);

  const advance = async (order, status) => {
    setBusy(`${order.order_number}:${status}`);
    try {
      await orderService.updateStatus(order.order_number, status);
      toast.success(`${order.order_number}: ${ORDER_STATUS_META[status]?.label}`);
      await queue.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  if (!staffBranch.id) {
    return <EmptyState title="لا فرع مرتبط بحسابك" text="اطلب من الإدارة ربط حسابك بفرع لتظهر طلباته هنا." />;
  }

  const orders = queue.data ?? [];

  return (
    <section aria-label="طابور الطلبات">
      <p className="row row--between text-xs muted" style={{ marginBlockEnd: 'var(--s-3)' }}>
        <span>{staffBranch.name ?? 'الفرع'} · <span className="numeral">{num(orders.length)}</span> طلبًا مفتوحًا</span>
        <span>يتحدّث تلقائيًا</span>
      </p>

      {queue.loading && orders.length === 0 && <Skeleton height={160} radius="var(--r-lg)" />}

      {!queue.loading && orders.length === 0 && (
        <EmptyState icon={<IconCheck size={34} />} title="لا طلبات مفتوحة" text="كل الطلبات أُنجزت. سيظهر أي طلب جديد هنا تلقائيًا." />
      )}

      <div className="stack">
        {orders.map((order) => {
          const meta = ORDER_STATUS_META[order.status] ?? { label: order.status, tone: 'pending' };
          const options = nextStatuses(order).filter((status) => !NEEDS_REASON.has(status));
          return (
            <article key={order.order_number} className="card queue-card">
              <div className="row row--between">
                <Link to={`/orders/${order.order_number}`} className="order-card__num ltr link">{order.order_number}</Link>
                <span className={`pill pill--${meta.tone}`}>{meta.label}</span>
              </div>
              <div className="text-sm soft">
                {order.customer_name}
                {order.customer_phone && <> · <a href={`tel:${order.customer_phone}`} className="ltr link"><IconPhone size={13} style={{ verticalAlign: 'middle' }} /> {order.customer_phone}</a></>}
              </div>
              <div className="text-xs muted">
                <span className="numeral">{num(order.items_count)}</span> صنفًا · {order.fulfillment_type === 'delivery' ? 'توصيل' : 'استلام'}
                {order.slot_from && <> · موعد <span className="numeral ltr">{String(order.slot_from).slice(0, 5)}</span></>}
                {' '}· منذ <span className="numeral">{num(order.minutes_waiting)}</span> دقيقة
              </div>
              <strong className="numeral ltr">{money(order.grand_total)}</strong>
              {options.length > 0 && (
                <div className="queue-card__actions">
                  {options.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={Boolean(busy)}
                      onClick={() => advance(order, status)}
                    >
                      {busy === `${order.order_number}:${status}` ? <span className="spinner" /> : ACTION_LABELS[status]}
                    </button>
                  ))}
                  <Link to={`/orders/${order.order_number}`} className="btn btn--outline btn--sm">التفاصيل <IconChevronLeft size={14} /></Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Transfers() {
  const staffBranch = useStaffBranch();
  const { user } = useAuth();
  const [reviewing, setReviewing] = useState(null);

  // المدير العام يرى تحويلات كل الفروع؛ مدير الفرع يُقصَر على فرعه في الخادم
  const queue = useAsync(
    () => paymentService.reviewQueue(user?.role === 'admin' ? undefined : staffBranch.id ?? undefined),
    [staffBranch.id, user?.role],
  );
  useLiveReload(queue.reload);

  const rows = queue.data ?? [];

  return (
    <section aria-label="تحويلات تنتظر المراجعة">
      <p className="text-xs muted" style={{ marginBlockEnd: 'var(--s-3)' }}>
        لا يُعتبر أي تحويل مدفوعًا حتى يعتمده أحدكم بعد مطابقة الإيصال.
      </p>

      {queue.loading && rows.length === 0 && <Skeleton height={140} radius="var(--r-lg)" />}

      {!queue.loading && rows.length === 0 && (
        <EmptyState icon={<IconCheck size={34} />} title="لا تحويلات تنتظر" text="كل الإيصالات المرفوعة تمّت مراجعتها." />
      )}

      <div className="stack--tight">
        {rows.map((row) => (
          <button key={row.payment_id ?? row.order_number} type="button" className="card queue-card" style={{ textAlign: 'start', width: '100%' }} onClick={() => setReviewing(row)}>
            <div className="row row--between">
              <span className="order-card__num ltr">{row.order_number}</span>
              <strong className="numeral ltr">{money(row.grand_total)}</strong>
            </div>
            <span className="text-sm soft">{row.customer_name}{row.branch_name && <> · {row.branch_name}</>}</span>
            <span className="text-xs muted">
              المحوِّل: {row.sender_name || '—'} · رُفع {timeAgo(row.proof_uploaded_at)}
            </span>
          </button>
        ))}
      </div>

      <ReviewSheet row={reviewing} onClose={() => setReviewing(null)} onDone={queue.reload} />
    </section>
  );
}

/** مراجعة إيصال: اعتماد مباشر، أو رفض بسبب مكتوب يراه العميل */
function ReviewSheet({ row, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => { if (row) setNote(''); }, [row]);

  const decide = async (approved) => {
    if (!approved && !note.trim()) {
      toast.error('اكتب سبب الرفض — سيراه العميل');
      return;
    }
    setBusy(approved ? 'approve' : 'reject');
    try {
      await paymentService.reviewProof(row.order_number, approved, note.trim() || undefined);
      toast.success(approved ? 'اعتُمد التحويل وبدأ التجهيز' : 'أُبلغ العميل بالرفض');
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      title="مراجعة تحويل إنستاباي"
      footer={row && (
        <>
          <button type="button" className="btn btn--danger grow" onClick={() => decide(false)} disabled={Boolean(busy)}>
            {busy === 'reject' ? <span className="spinner" /> : <><IconClose size={16} /> رفض</>}
          </button>
          <button type="button" className="btn btn--primary grow" onClick={() => decide(true)} disabled={Boolean(busy)}>
            {busy === 'approve' ? <span className="spinner" /> : <><IconCheck size={16} /> اعتماد</>}
          </button>
        </>
      )}
    >
      {row && (
        <div className="stack">
          <dl className="kv">
            <div className="kv__row"><dt>الطلب</dt><dd className="ltr">{row.order_number}</dd></div>
            <div className="kv__row"><dt>المبلغ المستحقّ</dt><dd><strong className="ltr">{money(row.grand_total)}</strong></dd></div>
            <div className="kv__row"><dt>العميل</dt><dd>{row.customer_name}{row.customer_phone && <> · <span className="ltr">{row.customer_phone}</span></>}</dd></div>
            <div className="kv__row"><dt>اسم المحوِّل</dt><dd>{row.sender_name || '— لم يُكتب —'}</dd></div>
            <div className="kv__row"><dt>رقم العملية</dt><dd className="ltr">{row.transaction_ref || '— لم يُكتب —'}</dd></div>
            <div className="kv__row"><dt>وقت الرفع</dt><dd>{timeAgo(row.proof_uploaded_at)}</dd></div>
          </dl>

          {row.proof_url && (
            <figure className="stack--tight">
              <img src={row.proof_url} alt={`إيصال تحويل الطلب ${row.order_number}`} className="proof-img" />
              <a href={row.proof_url} target="_blank" rel="noreferrer noopener" className="link text-sm row" style={{ gap: 4 }}>
                افتح الصورة بحجمها الكامل <IconExternal size={14} />
              </a>
            </figure>
          )}

          <Field label="ملاحظة" name="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} placeholder="سبب الرفض إن رفضت — يظهر للعميل" />
        </div>
      )}
    </Sheet>
  );
}

/** فتح طلب برقمه — العميل يسأل على الهاتف برقم طلبه */
function Lookup() {
  const navigate = useNavigate();
  const [number, setNumber] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const value = number.trim().toUpperCase();
    if (value) navigate(`/orders/${encodeURIComponent(value)}`);
  };

  return (
    <form className="card card--pad" onSubmit={submit} noValidate>
      <Field
        label="رقم الطلب"
        name="order_number"
        dir="ltr"
        autoCapitalize="characters"
        autoComplete="off"
        enterKeyHint="go"
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        hint="كما يظهر في إشعار العميل أو إيصاله"
      />
      <button type="submit" className="btn btn--primary btn--block" disabled={!number.trim()}>
        <IconSearch size={17} /> فتح الطلب
      </button>
      <p className="text-xs muted" style={{ marginBlockStart: 'var(--s-3)' }}>
        من صفحة الطلب تحرّك حالته إلى المرحلة التالية، أو تلغيه بسبب يصل إلى العميل.
      </p>
    </form>
  );
}
