import Screen from '@/components/shell/Screen.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconCheck, IconGift, IconWallet } from '@/lib/icons.jsx';
import { loyaltyService, userService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { money, num, formatDate } from '@/lib/format.js';

const TYPE_LABELS = { earn: 'اكتساب', redeem: 'استبدال', bonus: 'هدية', expire: 'انتهاء', adjust: 'تسوية' };

/**
 * كشف نقاط الولاء والمحفظة — قوائم لا جداول، فالجدول ذو الأعمدة
 * الخمسة يتمرّر أفقيًا على الهاتف ويُخفي نصفه.
 */
export default function LoyaltyScreen() {
  const loyalty = useAsync(() => loyaltyService.overview(), []);
  const wallet = useAsync(() => userService.wallet(), []);

  const refresh = () => Promise.all([loyalty.reload(), wallet.reload()]);
  const data = loyalty.data ?? {};

  return (
    <Screen title="نقاطي ومحفظتي" back="/account" onRefresh={refresh}>
      {loyalty.loading ? <Skeleton height={180} radius="var(--r-lg)" /> : (
        <header className="card card--noir account-hero">
          <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>بطاقة رُمّان</span>
          <div className="row row--between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="loyalty-band__points numeral">{num(data.balance ?? 0)}</div>
              <div className="loyalty-band__note">نقطة · تساوي <span className="ltr">{money(data.value_egp ?? 0)}</span></div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div className="account-hero__tier">الفئة {data.tier?.label}</div>
              {data.next_tier && <div className="loyalty-band__note text-xs">التالية: {data.next_tier.label}</div>}
            </div>
          </div>
          {data.tier?.perks?.length > 0 && (
            <ul className="stack--tight text-sm" style={{ color: 'var(--ink-100)' }}>
              {data.tier.perks.map((perk) => (
                <li key={perk} className="row" style={{ gap: 'var(--s-2)', alignItems: 'flex-start' }}>
                  <IconCheck size={15} style={{ color: 'var(--gold-300)', marginBlockStart: 4 }} /> {perk}
                </li>
              ))}
            </ul>
          )}
        </header>
      )}

      <div className="stats" style={{ marginBlockStart: 'var(--s-4)' }}>
        <div className="stat">
          <span className="stat__label">إجمالي المكتسب</span>
          <span className="stat__value">{num(data.stats?.total_earned ?? 0)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">إجمالي المستبدل</span>
          <span className="stat__value">{num(data.stats?.total_redeemed ?? 0)}</span>
        </div>
      </div>

      <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
        <h2 className="card__title row" style={{ gap: 'var(--s-2)' }}><IconGift size={18} className="text-brand" /> حركة النقاط</h2>
        {(data.transactions?.length ?? 0) === 0 ? (
          <p className="text-sm muted">لا توجد حركات بعد.</p>
        ) : data.transactions.map((row, index) => (
          <div key={index} className="prow" style={{ minHeight: 56 }}>
            <span className="prow__body">
              <span className="prow__name">{TYPE_LABELS[row.type] ?? row.type}</span>
              <span className="prow__meta">
                {row.note || (row.order_number && <span className="ltr">{row.order_number}</span>) || '—'} · {formatDate(row.created_at)}
              </span>
            </span>
            <span style={{ textAlign: 'end' }}>
              <span className={`prow__price numeral ltr ${row.points > 0 ? 'text-success' : 'text-danger'}`} style={{ display: 'block' }}>
                {row.points > 0 ? '+' : ''}{num(row.points)}
              </span>
              <span className="text-xs muted">الرصيد <span className="numeral">{num(row.balance_after)}</span></span>
            </span>
          </div>
        ))}
      </section>

      <section className="card card--pad" style={{ marginBlockStart: 'var(--s-4)' }}>
        <h2 className="card__title row" style={{ gap: 'var(--s-2)' }}><IconWallet size={18} className="text-brand" /> المحفظة</h2>
        <p className="stat__value numeral ltr" style={{ textAlign: 'start' }}>{money(wallet.data?.balance ?? 0)}</p>
        <p className="text-xs muted" style={{ marginBlockEnd: 'var(--s-3)' }}>يُستخدم رصيد المحفظة في الدفع مباشرة، ويصل إليه أي استرداد.</p>
        {(wallet.data?.transactions?.length ?? 0) === 0 ? (
          !wallet.loading && <EmptyState compact icon={<IconWallet size={24} />} title="لا حركات في المحفظة" />
        ) : wallet.data.transactions.map((row, index) => (
          <div key={index} className="prow" style={{ minHeight: 56 }}>
            <span className="prow__body">
              <span className="prow__name">{row.reason}</span>
              <span className="prow__meta">{formatDate(row.created_at)}</span>
            </span>
            <span style={{ textAlign: 'end' }}>
              <span className={`prow__price numeral ltr ${row.type === 'credit' ? 'text-success' : 'text-danger'}`} style={{ display: 'block' }}>
                {row.type === 'credit' ? '+' : '−'}{money(row.amount)}
              </span>
              <span className="text-xs muted">الرصيد <span className="ltr">{money(row.balance_after)}</span></span>
            </span>
          </div>
        ))}
      </section>
    </Screen>
  );
}
