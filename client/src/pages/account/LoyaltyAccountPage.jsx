import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { IconGift, IconWallet, IconCheck } from '@/lib/icons.jsx';
import { loyaltyService, userService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { money, num, formatDate } from '@/lib/format.js';

const TYPE_LABELS = { earn: 'اكتساب', redeem: 'استبدال', bonus: 'هدية', expire: 'انتهاء', adjust: 'تسوية' };

/** كشف نقاط الولاء والمحفظة */
export default function LoyaltyAccountPage() {
  const loyalty = useAsync(() => loyaltyService.overview(), []);
  const wallet = useAsync(() => userService.wallet(), []);

  if (loyalty.loading) return <Skeleton height={320} />;

  const data = loyalty.data ?? {};

  return (
    <div className="stack">
      <div className="panel" style={{ background: 'var(--brand)', color: '#fff', borderColor: 'transparent' }}>
        <span className="eyebrow eyebrow--onDark">بطاقة رُمّان</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--s-4)', flexWrap: 'wrap', marginTop: 'var(--s-2)' }}>
          <div>
            <div className="numeral" style={{ fontSize: 'var(--t-3xl)', lineHeight: 1, color: '#fff' }}>
              {num(data.balance ?? 0)}
            </div>
            <div style={{ fontSize: 'var(--t-sm)', color: 'rgba(255,255,255,.82)' }}>
              نقطة · تساوي {money(data.value_egp ?? 0)}
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>الفئة {data.tier?.label}</div>
            {data.next_tier && (
              <div style={{ fontSize: 'var(--t-xs)', color: 'rgba(255,255,255,.76)' }}>
                التالية: {data.next_tier.label}
              </div>
            )}
          </div>
        </div>

        {data.tier?.perks && (
          <ul style={{ marginTop: 'var(--s-5)', display: 'grid', gap: 8, fontSize: 'var(--t-sm)', color: 'rgba(255,255,255,.9)' }}>
            {data.tier.perks.map((perk) => (
              <li key={perk} style={{ display: 'flex', gap: 8 }}>
                <IconCheck size={15} style={{ color: '#fff', flexShrink: 0, marginTop: 3 }} /> {perk}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">إجمالي المكتسب</span>
          <div className="stat__value">{num(data.stats?.total_earned ?? 0)}</div>
        </div>
        <div className="stat">
          <span className="stat__label">إجمالي المستبدل</span>
          <div className="stat__value">{num(data.stats?.total_redeemed ?? 0)}</div>
        </div>
        <div className="stat">
          <span className="stat__label">رصيد المحفظة</span>
          <div className="stat__value">{money(wallet.data?.balance ?? 0)}</div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <IconGift size={18} style={{ color: 'var(--brand-text)' }} /> حركة النقاط
        </h3>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>النوع</th><th>البيان</th><th>النقاط</th><th>الرصيد</th><th>التاريخ</th></tr>
            </thead>
            <tbody>
              {(data.transactions ?? []).map((row, index) => (
                <tr key={index}>
                  <td>{TYPE_LABELS[row.type] ?? row.type}</td>
                  <td className="muted">{row.note || row.order_number || '—'}</td>
                  <td className="numeral" style={{ color: row.points > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {row.points > 0 ? '+' : ''}{num(row.points)}
                  </td>
                  <td className="numeral">{num(row.balance_after)}</td>
                  <td className="muted">{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(data.transactions?.length ?? 0) === 0 && <p className="muted">لا توجد حركات بعد.</p>}
      </div>

      {(wallet.data?.transactions?.length ?? 0) > 0 && (
        <div className="panel">
          <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <IconWallet size={18} style={{ color: 'var(--brand-text)' }} /> حركة المحفظة
          </h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>البيان</th><th>المبلغ</th><th>الرصيد</th><th>التاريخ</th></tr></thead>
              <tbody>
                {wallet.data.transactions.map((row, index) => (
                  <tr key={index}>
                    <td>{row.reason}</td>
                    <td className="numeral" style={{ color: row.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                      {row.type === 'credit' ? '+' : '−'}{money(row.amount)}
                    </td>
                    <td className="numeral">{money(row.balance_after)}</td>
                    <td className="muted">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
