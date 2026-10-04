import { useState } from 'react';
import Screen from '@/components/shell/Screen.jsx';
import SwipeRow from '@/components/ui/SwipeRow.jsx';
import ConfirmSheet from '@/components/ui/ConfirmSheet.jsx';
import AddressSheet from '@/features/checkout/AddressSheet.jsx';
import { addressLine } from '@/features/checkout/FulfillmentStep.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconPin, IconPlus, IconTrash } from '@/lib/icons.jsx';
import { addressService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';

/**
 * دفتر العناوين: إضافة، وتعيين الافتراضي، وحذف (بسحبٍ أو بزرّ، ثم
 * تأكيد). العنوان الافتراضي هو ما يُختار تلقائيًا عند الدفع.
 */
export default function AddressesScreen() {
  const toast = useToast();
  const addresses = useAsync(() => addressService.list(), []);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const makeDefault = async (id) => {
    try {
      await addressService.update(id, { is_default: true });
      await addresses.reload();
      toast.success('صار العنوان الافتراضي');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await addressService.remove(removing.id);
      await addresses.reload();
      toast.toast('حُذف العنوان');
      setRemoving(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const list = addresses.data ?? [];

  return (
    <Screen
      title="عناويني"
      back="/account"
      trailing={(
        <button type="button" className="icon-btn" onClick={() => setAdding(true)} aria-label="إضافة عنوان">
          <IconPlus size={22} />
        </button>
      )}
      onRefresh={addresses.reload}
    >
      {addresses.loading && <Skeleton height={120} radius="var(--r-lg)" />}

      {!addresses.loading && list.length === 0 && (
        <EmptyState
          icon={<IconPin size={34} />}
          title="لا توجد عناوين محفوظة"
          text="أضف عنوانك الأول لتُتمّ طلباتك بسرعة."
          actionLabel="أضف عنوانًا"
          onClick={() => setAdding(true)}
        />
      )}

      <div className="stack">
        {list.map((address) => (
          <SwipeRow key={address.id} onDelete={() => setRemoving(address)}>
            <div className="card card--pad stack--tight">
              <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                <strong style={{ fontFamily: 'var(--font-display)' }}>
                  {address.label}
                  {Boolean(address.is_default) && <span className="badge badge--lux" style={{ marginInlineStart: 8 }}>افتراضي</span>}
                </strong>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setRemoving(address)} aria-label={`حذف عنوان ${address.label}`}>
                  <IconTrash size={18} />
                </button>
              </div>
              <p className="text-sm soft">
                {addressLine(address)}
                {address.floor && `، دور ${address.floor}`}
                {address.landmark && <><br />علامة مميّزة: {address.landmark}</>}
              </p>
              <p className="text-xs muted">{address.recipient_name} · <span className="ltr">{address.phone}</span></p>
              {!address.is_default && (
                <button type="button" className="btn btn--outline btn--sm" style={{ justifySelf: 'start' }} onClick={() => makeDefault(address.id)}>
                  اجعله الافتراضي
                </button>
              )}
            </div>
          </SwipeRow>
        ))}
      </div>

      <AddressSheet open={adding} onClose={() => setAdding(false)} makeDefault={list.length === 0} onSaved={() => addresses.reload()} />

      <ConfirmSheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        busy={busy}
        title="حذف العنوان؟"
        message={removing ? `«${removing.label}» — ${addressLine(removing)}` : ''}
        confirmLabel="حذف"
      />
    </Screen>
  );
}
