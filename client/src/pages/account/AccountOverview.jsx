import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import StatTiles from '@/components/account/StatTiles.jsx';
import TierProgress from '@/components/account/TierProgress.jsx';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import { IconPackage, IconGift, IconHeart, IconWallet, IconChevronLeft } from '@/lib/icons.jsx';
import { userService, reviewService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { money, num, formatDate, ORDER_STATUS_META } from '@/lib/format.js';

/** لوحة الحساب: أرقام سريعة + تقدّم الفئة + آخر طلب + دعوة للتقييم */
export default function AccountOverview() {
  const { user } = useAuth();
  const summary = useAsync(() => userService.summary(), []);
  const profile = useAsync(() => userService.profile(), []);
  const pendingReviews = useAsync(() => reviewService.pending(), []);

  if (summary.loading) {
    return <div className="stat-grid">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={120} />)}</div>;
  }

  const data = summary.data ?? {};
  const lastOrder = data.last_order;

  return (
    <div className="stack">
      <StatTiles
        items={[
          { label: 'طلباتك', value: num(data.orders?.total ?? 0), note: `${data.orders?.active ?? 0} قيد التنفيذ`, icon: IconPackage, color: 'var(--teal)' },
          { label: 'نقاط الولاء', value: num(user?.loyalty_points ?? 0), note: `تساوي ${money((user?.loyalty_points ?? 0) * 0.05)}`, icon: IconGift, color: 'var(--brand)' },
          { label: 'رصيد المحفظة', value: money(user?.wallet_balance ?? 0), note: 'يُستخدم في الدفع مباشرة', icon: IconWallet, color: 'var(--gold-400)' },
          { label: 'المفضّلة', value: num(data.wishlist_count ?? 0), note: 'صنفًا محفوظًا', icon: IconHeart, color: 'var(--emerald)' },
        ]}
      />

      <TierProgress profile={profile.data} />

      {lastOrder && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
            <h3 style={{ fontSize: 'var(--t-md)' }}>آخر طلب</h3>
            <Link to="/account/orders" className="link-underline" style={{ fontSize: 'var(--t-sm)' }}>كل الطلبات</Link>
          </div>

          <Link to={`/account/orders/${lastOrder.order_number}`} className="order-card" style={{ marginBottom: 0 }}>
            <div className="order-card__head">
              <div>
                <div className="order-card__num">{lastOrder.order_number}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                  {lastOrder.branch_name} · {formatDate(lastOrder.placed_at)}
                </div>
              </div>
              <span className={`status status--${ORDER_STATUS_META[lastOrder.status]?.tone}`}>
                {ORDER_STATUS_META[lastOrder.status]?.label}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong className="numeral">{money(lastOrder.grand_total)}</strong>
              <IconChevronLeft size={16} />
            </div>
          </Link>
        </div>
      )}

      {pendingReviews.data?.length > 0 && (
        <div className="panel">
          <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-2)' }}>قيّم ما استلمته</h3>
          <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
            رأيك يساعد بقية العملاء — ويساعدنا على معرفة ما يستحق البقاء على الرف.
          </p>

          <div className="rail__track" style={{ marginTop: 'var(--s-4)', gridAutoColumns: 'minmax(140px, 1fr)' }}>
            {pendingReviews.data.slice(0, 6).map((item) => (
              <Link key={item.id} to={`/product/${item.slug}`} style={{ display: 'grid', gap: 8 }}>
                <div style={{ containerType: 'inline-size' }}>
                  <ProductPlate name={item.name_ar} motif={item.category_motif} accent={item.category_accent} compact />
                </div>
                <span style={{ fontSize: 'var(--t-xs)', lineHeight: 1.4, fontWeight: 500 }}>{item.name_ar}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
