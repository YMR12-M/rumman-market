import SectionHead from '@/components/brand/SectionHead.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { Aril } from '@/lib/art.jsx';
import { catalogService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useSite } from '@/context/SiteContext.jsx';
import { money, num } from '@/lib/format.js';

/**
 * شريط برنامج الولاء.
 *
 * الفئات وشروطها تأتي من الخادم لا من نصّ في الواجهة — فالمصدر
 * الوحيد للحقيقة هو نفسه الذي يحسب نقاط العميل عند الشراء. لو
 * اختلف الاثنان لوعدنا العميل بشيء ثم أعطيناه غيره.
 */
export default function LoyaltyBand() {
  const { loyalty } = useSite();
  const tiers = useAsync(() => catalogService.loyaltyTiers(), []);

  const perPoint = loyalty.point_value_egp > 0 ? Math.round(1 / loyalty.point_value_egp) : 20;

  return (
    <section className="section loyalty-band">
      <div className="container">
        <SectionHead
          eyebrow="برنامج الولاء"
          title="كلّما تسوّقت، اقتربت أكثر"
          description={`${num(loyalty.points_per_egp)} نقطة لكل جنيه، وكل ${num(perPoint)} نقطة تساوي جنيهًا في طلبك التالي. بلا اشتراك وبلا رسوم.`}
          actionLabel="تفاصيل البرنامج"
          actionTo="/loyalty"
        />

        {tiers.loading ? (
          <div className="tiers">
            {[0, 1, 2].map((index) => <Skeleton key={index} height={230} radius="var(--r-lg)" />)}
          </div>
        ) : (
          <div className="tiers">
            {(tiers.data?.tiers ?? []).map((tier, index) => (
              <div
                key={tier.key}
                className={`tier tier--${tier.key} reveal${tier.key === 'gold' ? ' tier--featured' : ''}`}
                data-delay={index + 1}
              >
                <span className="tier__punch" aria-hidden="true" />
                <div className="tier__name">{tier.label}</div>
                <div className="tier__req">
                  {Number(tier.minSpent) > 0 ? `إنفاق ${money(tier.minSpent)}` : 'من أول طلب'}
                </div>
                <ul className="tier__perks">
                  {(tier.perks ?? []).map((perk) => (
                    <li key={perk}><Aril size={9} color="currentColor" /> {perk}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
