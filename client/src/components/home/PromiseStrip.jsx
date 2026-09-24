import { IconLeaf, IconStore, IconTruck, IconShield } from '@/lib/icons.jsx';
import { PROMISES } from '@/data/content.js';

/** خريطة الأيقونات: النصوص في data/content.js تشير إليها بالاسم */
const ICONS = { leaf: IconLeaf, store: IconStore, truck: IconTruck, shield: IconShield };

/** وعود المتجر الأربعة — كل وعد بلونه ليكسر رتابة الصفّ */
export default function PromiseStrip() {
  return (
    <div className="container">
      <div className="promise">
        {PROMISES.map((promise, index) => {
          const Icon = ICONS[promise.icon];
          return (
            <div className="promise__item reveal" data-delay={index + 1} key={promise.title}>
              <span className="promise__icon" style={{ background: promise.color }}>
                <Icon size={22} />
              </span>
              <div>
                <div className="promise__title">{promise.title}</div>
                <div className="promise__note">{promise.note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
