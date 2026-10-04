import { IconLeaf, IconStore, IconTruck, IconShield } from '@/lib/icons.jsx';
import { PROMISES } from '@/data/content.js';

/** خريطة الأيقونات: النصوص في data/content.js تشير إليها بالاسم */
const ICONS = { leaf: IconLeaf, store: IconStore, truck: IconTruck, shield: IconShield };

/** ميل كل بطاقة على الحبل — يكسر الاستقامة المصطنعة */
const TILTS = ['-2.2deg', '1.6deg', '-1deg', '2.4deg'];

/**
 * وعود المتجر الأربعة: بطاقات سعر معلّقة على حبل.
 * بدل أربعة صناديق متطابقة بأيقونات في مربّعات ملوّنة، يتدلّى كل وعد
 * من خيط بميلٍ مختلف، ولكلٍّ لونه من طيف الهوية، ويتأرجح عند المرور.
 */
export default function PromiseStrip() {
  return (
    <div className="container">
      <div className="promises rope">
        {PROMISES.map((promise, index) => {
          const Icon = ICONS[promise.icon];
          return (
            <div
              className="promise tag hang reveal"
              data-delay={index + 1}
              key={promise.title}
              style={{ '--tilt': TILTS[index % TILTS.length], '--promise-color': promise.color }}
            >
              <span className="promise__icon">
                <Icon size={22} />
              </span>
              <div className="promise__title">{promise.title}</div>
              <div className="promise__note">{promise.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
