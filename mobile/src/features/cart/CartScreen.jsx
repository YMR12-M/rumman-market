import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ActionBar from '@/components/shell/ActionBar.jsx';
import ConfirmSheet from '@/components/ui/ConfirmSheet.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';
import CartLine from './CartLine.jsx';
import Summary from './Summary.jsx';
import { EmptyState } from '@/components/ui/Feedback.jsx';
import { IconCart, IconClose, IconInfo, IconPin, IconTag, IconTruck } from '@/lib/icons.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useCart } from '@/context/CartContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  السلة — تبويب كامل لا درج جانبي
 *
 *  تعرض ما يمنع الطلب قبل أن يصل العميل إلى الدفع: تنبيهات الأصناف،
 *  والحدّ الأدنى للطلب في الفرع، وكم بقي على التوصيل المجاني. زرّ
 *  المتابعة ثابت فوق التبويبات ولا يتفعّل إلا والسلة سليمة — القاعدة
 *  نفسها التي يطبّقها الخادم عند إنشاء الطلب.
 * ═══════════════════════════════════════════════════════════════
 */
export default function CartScreen() {
  const navigate = useNavigate();
  const { cart, loading, clear, applyCoupon, removeCoupon, refresh } = useCart();
  const { branch, branchId, openPicker } = useBranch();
  const { isAuthenticated } = useAuth();

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const suggestions = useAsync(
    () => (branchId ? catalogService.products({ branch_id: branchId, sort: 'popular', limit: 8 }) : Promise.resolve(null)),
    [branchId],
  );

  const { totals } = cart;
  const empty = cart.items.length === 0;
  const canCheckout = !empty && totals.meets_minimum && !cart.has_issues;

  const submitCoupon = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    const applied = await applyCoupon(code.trim());
    if (applied) setCode('');
    setApplying(false);
  };

  if (empty && !loading) {
    return (
      <Screen title="السلة" onRefresh={refresh}>
        <EmptyState
          icon={<IconCart size={36} />}
          title="سلتك فارغة"
          text="ابدأ من الأقسام أو من مختارات الأسبوع."
          actionLabel="ابدأ التسوّق"
          to="/categories"
        />
        <ProductRail title="الأكثر طلبًا" products={suggestions.data?.items} loading={suggestions.loading} />
      </Screen>
    );
  }

  const freeGoal = totals.subtotal + totals.amount_to_free_delivery;
  const freeProgress = freeGoal > 0 ? Math.min(100, (totals.subtotal / freeGoal) * 100) : 100;

  return (
    <Screen
      title="السلة"
      subtitle={<><span className="numeral">{num(cart.items_count)}</span> صنفًا</>}
      trailing={(
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>إفراغ</button>
      )}
      actionbar
      onRefresh={refresh}
    >
      <button type="button" className="branch-pick" onClick={openPicker}>
        <span className="branch-pick__icon"><IconPin size={18} /></span>
        <span className="grow">
          <span className="branch-pick__label">تتسوّق من — الأسعار تتبع هذا الفرع</span>
          <span className="branch-pick__name">{branch?.name_ar ?? 'اختر فرعًا'}</span>
        </span>
        <span className="text-xs text-brand">تغيير</span>
      </button>

      {cart.has_issues && (
        <p className="notice notice--danger" style={{ marginBlockStart: 'var(--s-3)' }}>
          <IconInfo size={18} />
          <span>بعض الأصناف لم تعد متاحة بالكمية المطلوبة في هذا الفرع. عدّل الكميات أو احذف الصنف للمتابعة.</span>
        </p>
      )}

      {totals.subtotal > 0 && (
        <div className="card card--pad freebar" style={{ marginBlockStart: 'var(--s-3)' }}>
          <span className="row" style={{ gap: 'var(--s-2)' }}>
            <IconTruck size={18} className={totals.free_delivery_applied ? 'text-success' : 'text-brand'} />
            {totals.free_delivery_applied
              ? <strong className="text-success">التوصيل مجاني على هذا الطلب</strong>
              : totals.amount_to_free_delivery > 0
                ? <span>أضف <strong className="ltr">{money(totals.amount_to_free_delivery)}</strong> ليصبح التوصيل مجانيًا</span>
                : <span>رسوم التوصيل من هذا الفرع <span className="ltr">{money(totals.delivery_fee)}</span></span>}
          </span>
          {totals.amount_to_free_delivery > 0 && (
            <div className="progress"><div className="progress__fill" style={{ width: `${freeProgress}%` }} /></div>
          )}
        </div>
      )}

      <div className="stack-lines card" style={{ marginBlockStart: 'var(--s-3)', padding: 'var(--s-1)' }}>
        {cart.items.map((item) => <CartLine key={item.product_id} item={item} />)}
      </div>
      <p className="text-xs muted" style={{ textAlign: 'center', marginBlockStart: 'var(--s-2)' }}>
        اسحب الصنف جانبًا لحذفه، أو استخدم زرّ الحذف.
      </p>

      <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
        {isAuthenticated ? (
          cart.coupon ? (
            <div className="row row--between">
              <span className="row" style={{ gap: 'var(--s-2)' }}>
                <IconTag size={18} className="text-success" />
                <span>
                  <strong className="text-sm">{cart.coupon.title_ar ?? 'كود الخصم'}</strong>
                  <span className="text-xs muted numeral ltr" style={{ display: 'block' }}>{cart.coupon.code}</span>
                </span>
              </span>
              <button type="button" className="icon-btn" onClick={removeCoupon} aria-label="إزالة كود الخصم"><IconClose size={18} /></button>
            </div>
          ) : (
            <form onSubmit={submitCoupon} className="row" style={{ gap: 'var(--s-2)' }}>
              <input
                className="input ltr grow"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="كود الخصم"
                aria-label="كود الخصم"
                autoCapitalize="characters"
                autoComplete="off"
                enterKeyHint="done"
                style={{ textAlign: 'start' }}
              />
              <button type="submit" className="btn btn--outline" disabled={applying || !code.trim()}>
                {applying ? <span className="spinner" /> : 'تطبيق'}
              </button>
            </form>
          )
        ) : (
          <p className="text-sm muted"><IconTag size={16} style={{ verticalAlign: 'middle' }} /> سجّل الدخول لاستخدام أكواد الخصم ونقاط الولاء.</p>
        )}
      </section>

      <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
        <h2 className="card__title">ملخّص الطلب</h2>
        <Summary totals={totals} couponCode={cart.coupon?.code} />
        {!totals.meets_minimum && totals.minimum_required > 0 && (
          <p className="notice notice--warn" style={{ marginBlockStart: 'var(--s-3)' }}>
            الحدّ الأدنى للطلب في هذا الفرع <span className="ltr">{money(totals.minimum_required)}</span>.
          </p>
        )}
      </section>

      <ActionBar aboveTabs>
        <div className="actionbar__meta">
          <small>الإجمالي</small>
          <strong className="numeral ltr">{money(totals.grand_total)}</strong>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--lg grow"
          disabled={!canCheckout}
          onClick={() => navigate(isAuthenticated ? '/checkout' : '/login?next=/checkout')}
        >
          {isAuthenticated ? 'متابعة إلى الدفع' : 'سجّل الدخول للمتابعة'}
        </button>
      </ActionBar>

      <ConfirmSheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => { await clear(); setConfirmClear(false); }}
        title="إفراغ السلة؟"
        message={`ستُحذف الأصناف (${cart.items_count}) كلّها من سلتك في ${branch?.name_ar ?? 'هذا الفرع'}.`}
        confirmLabel="إفراغ السلة"
      />
    </Screen>
  );
}
