import { useState } from 'react';
import ConfirmSheet from '@/components/ui/ConfirmSheet.jsx';
import Field from '@/components/ui/Field.jsx';
import { IconChevronLeft, IconCoins } from '@/lib/icons.jsx';
import { orderService, paymentService } from '@/services/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money } from '@/lib/format.js';
import { ACTION_LABELS, NEEDS_REASON, atLeast, nextStatuses } from './transitions.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  أزرار فريق الفرع داخل صفحة الطلب
 *
 *  تحريك الحالة متاح لكل موظّف (كما في الخادم: STAFF فما فوق)،
 *  وتسجيل التحصيل النقدي لمدير الفرع فما فوق. الإلغاء والاسترداد
 *  يطلبان تأكيدًا وسببًا مكتوبًا يصل إلى العميل — لا رجعة فيهما.
 *  الصلاحية الحقيقية في الخادم؛ الواجهة تُخفي ما سيُرفض فقط.
 * ═══════════════════════════════════════════════════════════════
 */
export default function StaffOrderActions({ order, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');

  const options = nextStatuses(order);
  const canCollect = atLeast(user, 'branch_manager')
    && order.payment_method === 'cod'
    && order.payment_status !== 'paid'
    && !['cancelled', 'refunded'].includes(order.status);

  if (options.length === 0 && !canCollect) return null;

  const advance = async (status, note) => {
    setBusy(status);
    try {
      await orderService.updateStatus(order.order_number, status, note);
      toast.success('تم تحديث حالة الطلب');
      setPending(null);
      setReason('');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  const collect = async () => {
    setBusy('collect');
    try {
      await paymentService.collectCash(order.order_number);
      toast.success('تم تسجيل التحصيل النقدي');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card card--pad stack--tight" aria-label="إجراءات فريق الفرع">
      <h2 className="card__title" style={{ marginBlockEnd: 'var(--s-1)' }}>إجراءات الفرع</h2>
      {order.customer_name && (
        <p className="text-sm soft">
          العميل: {order.customer_name}
          {order.customer_phone && <> · <a href={`tel:${order.customer_phone}`} className="link ltr">{order.customer_phone}</a></>}
        </p>
      )}

      <div className="queue-card__actions">
        {options.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn ${NEEDS_REASON.has(status) ? 'btn--danger' : 'btn--primary'}`}
            disabled={Boolean(busy)}
            onClick={() => (NEEDS_REASON.has(status) ? setPending(status) : advance(status))}
          >
            {busy === status ? <span className="spinner" /> : ACTION_LABELS[status] ?? status}
            {!NEEDS_REASON.has(status) && <IconChevronLeft size={15} />}
          </button>
        ))}
      </div>

      {canCollect && (
        <button type="button" className="btn btn--outline btn--block" onClick={collect} disabled={Boolean(busy)}>
          {busy === 'collect' ? <span className="spinner" /> : <IconCoins size={17} />}
          سجّل تحصيل <span className="ltr">{money(order.grand_total)}</span> نقدًا
        </button>
      )}

      <ConfirmSheet
        open={pending !== null}
        onClose={() => { setPending(null); setReason(''); }}
        onConfirm={() => {
          if (!reason.trim()) { toast.error('اكتب السبب — سيراه العميل'); return; }
          advance(pending, reason.trim());
        }}
        busy={busy === pending}
        title={pending === 'refunded' ? 'استرداد قيمة الطلب؟' : 'إلغاء الطلب؟'}
        message={pending === 'refunded'
          ? 'تُعاد قيمة الطلب إلى محفظة العميل. لا يمكن التراجع عن هذا.'
          : 'يُبلَّغ العميل بالإلغاء وسببه، وتعود الكميات إلى المخزون. لا يمكن التراجع عن هذا.'}
        confirmLabel={pending === 'refunded' ? 'استرداد' : 'إلغاء الطلب'}
      >
        <Field label="السبب" name="reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} required placeholder="يظهر للعميل في صفحة طلبه" />
      </ConfirmSheet>
    </section>
  );
}
