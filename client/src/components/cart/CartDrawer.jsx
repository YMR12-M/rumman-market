import { Link } from 'react-router-dom';
import Drawer from '@/components/ui/Drawer.jsx';
import CartLine from './CartLine.jsx';
import FreeShippingBar from './FreeShippingBar.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { money } from '@/lib/format.js';
import { useCart } from '@/context/CartContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';

/** سلة جانبية سريعة — يفتحها زر السلة في الهيدر */
export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer } = useCart();
  const { branch } = useBranch();
  const isEmpty = cart.items.length === 0;

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={`سلتك (${cart.items_count})`}
      footer={!isEmpty && (
        <>
          <FreeShippingBar totals={cart.totals} />

          <div className="summary__row">
            <span>المجموع الفرعي</span>
            <strong className="numeral">{money(cart.totals.subtotal)}</strong>
          </div>
          <div className="summary__row muted" style={{ fontSize: 'var(--t-xs)' }}>
            <span>التوصيل من {branch?.name_ar}</span>
            <span className="numeral">{cart.totals.delivery_fee > 0 ? money(cart.totals.delivery_fee) : 'مجاني'}</span>
          </div>

          <Link to="/cart" className="btn btn--primary btn--block" onClick={closeDrawer} style={{ marginTop: 'var(--s-3)' }}>
            مراجعة السلة وإتمام الطلب
          </Link>
        </>
      )}
    >
      {isEmpty ? (
        <EmptyState
          title="سلتك فارغة"
          description="ابدأ من مختارات الأسبوع أو تصفّح الأقسام — كل ما تحتاجه لمائدتك في مكان واحد."
          actionLabel="ابدأ التسوّق"
          actionTo="/shop"
        />
      ) : (
        <>
          {cart.has_issues && (
            <div className="card card--pad" style={{ borderColor: 'var(--danger)', marginBottom: 'var(--s-4)', fontSize: 'var(--t-sm)' }}>
              بعض الأصناف لم تعد متاحة بالكمية المطلوبة في {branch?.name_ar}. عدّل الكميات للمتابعة.
            </div>
          )}
          {cart.items.map((item) => (
            <CartLine key={item.product_id} item={item} onNavigate={closeDrawer} />
          ))}
        </>
      )}
    </Drawer>
  );
}
