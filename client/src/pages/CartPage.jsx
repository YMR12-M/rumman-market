import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartLine from '@/components/cart/CartLine.jsx';
import FreeShippingBar from '@/components/cart/FreeShippingBar.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import ProductRail from '@/components/product/ProductRail.jsx';
import { IconTag, IconClose, IconChevronLeft, IconInfo } from '@/lib/icons.jsx';
import { money } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';

/**
 * صفحة السلة الكاملة.
 * تعرض التنبيهات على مستوى الصنف، وشريط التوصيل المجاني، وحقل الكوبون،
 * ثم تنقل العميل إلى الدفع فقط إذا استوفت السلة الحد الأدنى وخلت من المشاكل.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const { cart, clear, applyCoupon, removeCoupon } = useCart();
  const { branch, branchId, openPicker } = useBranch();
  const { isAuthenticated } = useAuth();

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const suggestions = useAsync(
    () => catalogService.products({ branch_id: branchId, sort: 'popular', limit: 8 }),
    [branchId],
  );

  const { totals } = cart;
  const canCheckout = cart.items.length > 0 && totals.meets_minimum && !cart.has_issues;

  const submitCoupon = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    const applied = await applyCoupon(code.trim());
    if (applied) setCode('');
    setApplying(false);
  };

  if (cart.items.length === 0) {
    return (
      <div className="container section">
        <EmptyState
          title="سلتك فارغة"
          description="ابدأ من مختارات الأسبوع، أو تصفّح الأقسام لتجد ما يناسب مائدتك."
          actionLabel="ابدأ التسوّق"
          actionTo="/shop"
        />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <ProductRail
            eyebrow="اقتراحات"
            title="الأكثر طلبًا هذا الشهر"
            products={suggestions.data?.items}
            loading={suggestions.loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container section--tight">
      <nav className="crumbs">
        <Link to="/">الرئيسية</Link>
        <span aria-hidden="true"><IconChevronLeft size={12} /></span>
        <span>سلة التسوّق</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap', marginBottom: 'var(--s-5)' }}>
        <div>
          <span className="eyebrow">مراجعة الطلب</span>
          <h1>سلتك ({cart.items_count} صنفًا)</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>إفراغ السلة</button>
      </div>

      <div className="checkout-grid">
        <div>
          {/* الفرع المختار — تنبيه مهم لأن الأسعار تتبعه */}
          <div className="card card--pad" style={{ marginBottom: 'var(--s-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 'var(--t-sm)' }}>
              <span className="muted">تتسوّق من</span>{' '}
              <strong>{branch?.name_ar}</strong>
              <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{branch?.address_ar}</div>
            </div>
            <button type="button" className="btn btn--outline btn--sm" onClick={openPicker}>تغيير الفرع</button>
          </div>

          {cart.has_issues && (
            <div className="card card--pad" style={{ borderColor: 'var(--danger)', marginBottom: 'var(--s-4)', display: 'flex', gap: 'var(--s-3)' }}>
              <IconInfo size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 'var(--t-sm)' }}>
                بعض الأصناف لم تعد متاحة بالكمية المطلوبة في هذا الفرع. عدّل الكميات أو احذف الصنف للمتابعة.
              </div>
            </div>
          )}

          <div className="panel">
            {cart.items.map((item) => <CartLine key={item.product_id} item={item} />)}
          </div>
        </div>

        {/* ── ملخّص الطلب ─────────────────────────────────── */}
        <aside className="summary">
          <div className="panel">
            <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-4)' }}>ملخّص الطلب</h3>

            <FreeShippingBar totals={totals} />

            <div className="summary__row">
              <span>المجموع الفرعي</span>
              <span className="numeral">{money(totals.subtotal)}</span>
            </div>

            {totals.discount_total > 0 && (
              <div className="summary__row summary__row--discount">
                <span>خصم {cart.coupon?.code}</span>
                <span className="numeral">−{money(totals.discount_total)}</span>
              </div>
            )}

            <div className="summary__row">
              <span>التوصيل</span>
              <span className="numeral">{totals.delivery_fee > 0 ? money(totals.delivery_fee) : 'مجاني'}</span>
            </div>

            {totals.tax_total > 0 && (
              <div className="summary__row">
                <span>ضريبة القيمة المضافة</span>
                <span className="numeral">{money(totals.tax_total)}</span>
              </div>
            )}

            <div className="summary__row summary__row--total">
              <span>الإجمالي</span>
              <span className="numeral">{money(totals.grand_total)}</span>
            </div>

            {/* الكوبون */}
            {isAuthenticated ? (
              cart.coupon ? (
                <div className="chip" style={{ marginTop: 'var(--s-4)' }}>
                  <IconTag size={13} /> {cart.coupon.title_ar}
                  <button type="button" onClick={removeCoupon} aria-label="إزالة الكود"><IconClose size={12} /></button>
                </div>
              ) : (
                <form onSubmit={submitCoupon} style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-4)' }}>
                  <input
                    className="input"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="كود الخصم"
                    aria-label="كود الخصم"
                  />
                  <button type="submit" className="btn btn--outline" disabled={applying}>تطبيق</button>
                </form>
              )
            ) : (
              <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-4)' }}>
                سجّل الدخول لاستخدام أكواد الخصم ونقاط الولاء.
              </p>
            )}

            {!totals.meets_minimum && (
              <p style={{ fontSize: 'var(--t-xs)', color: 'var(--danger)', marginTop: 'var(--s-3)' }}>
                الحد الأدنى للطلب في هذا الفرع {money(totals.minimum_required)}.
              </p>
            )}

            <button
              type="button"
              className="btn btn--primary btn--block btn--lg"
              style={{ marginTop: 'var(--s-4)' }}
              disabled={!canCheckout}
              onClick={() => navigate(isAuthenticated ? '/checkout' : '/login?next=/checkout')}
            >
              {isAuthenticated ? 'متابعة إلى الدفع' : 'سجّل الدخول لإتمام الطلب'}
            </button>

            <Link to="/shop" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s-2)' }}>
              متابعة التسوّق
            </Link>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 'var(--s-8)' }}>
        <ProductRail
          eyebrow="قبل أن تكمل"
          title="أضفها إلى طلبك"
          products={suggestions.data?.items}
          loading={suggestions.loading}
        />
      </div>
    </div>
  );
}
