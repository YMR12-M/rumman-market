/**
 * ═══════════════════════════════════════════════════════════════
 *  رسومات الستيكرات — واحدة لكل قسم
 *
 *  لماذا رسوم مسطّحة بحدّ حبر بدل الأيقونات الخطية الرفيعة؟
 *  الأيقونة الخطية الباهتة هي أوضح علامات «القالب الجاهز». أمّا
 *  الرسم المسطّح ذو الحدّ السميك والتظليل البسيط فيقرأ كملصق
 *  مطبوع على علبة أو لافتة محلّ — وهذا ما نريده من سوبر ماركت.
 *
 *  الرسمة تُطبع بألوان الطعام الحقيقية (الطماطم حمراء، السمكة زرقاء) مهما
 *  كان لون القسم؛ أمّا لافتة القسم وورقة المنتج فتأخذان لون القسم من
 *  قاعدة البيانات. فتبقى اللافتات مسطّحة أحادية اللون والملصقات ملوّنة
 *  كأنها لُصقت عليها. الأصناف معرّفة في print.css:
 *
 *     rd or yl gn bl pk pu br  ألوان طبيعية (+ d داكن · l فاتح)
 *     cr عاجي دافئ · gy رمادي · w أبيض اللمعة · k حبر
 *     ol حدّ حبر سميك · ln خط تفصيل رفيع
 *
 *  كل الرسوم في مربّع 100×100.
 * ═══════════════════════════════════════════════════════════════
 */

export const Svg = ({ children, className = '', ...props }) => (
  <svg {...props} className={`art ${className}`.trim()} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    {children}
  </svg>
);

/**
 * نجمة رباعية لامعة بأضلاع مقعّرة — زينة لمعان صغيرة.
 * نقطة التحكّم في المركز تجعل كل ضلع ينحني نحو الداخل.
 */
export const Spark = ({ x, y, s = 6, cls = 'w' }) => (
  <path
    className={cls}
    d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
  />
);

export const ART = {
  /** خضار وفاكهة — طماطم بتاج أخضر */
  leaf: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M50 30C28 27 10 40 10 61c0 20 17 31 40 31s40-11 40-31C90 40 72 27 50 30Z" />
      <path className="rdd" d="M83 57c2 19-11 31-33 33 19-5 27-18 24-34 4 0 7 .6 9 1Z" />
      <path className="w" d="M21 57c0-10 6-17 14-20-5 5-8 12-8 20Z" />
      <path className="gn ol" d="M50 23 54 31 67 31 57 35 61 43 50 38 39 43 43 35 33 31 46 31Z" />
      <path className="ln" style={{ strokeWidth: 4.6 }} d="M50 24c0-6 2-10 7-12" />
    </Svg>
  ),

  /** لحوم ودواجن — فخذة دجاج بعظمتها */
  cleaver: (p) => (
    <Svg {...p}>
      <path className="ln" d="M37 69 15 87" style={{ strokeWidth: 11 }} />
      <path className="ln" d="M37 69 15 87" style={{ stroke: '#FFF8E8', strokeWidth: 5.4 }} />
      <circle className="k" cx="11" cy="82" r="7.6" />
      <circle className="k" cx="19" cy="91" r="7.6" />
      <circle className="w" cx="11" cy="82" r="4.6" />
      <circle className="w" cx="19" cy="91" r="4.6" />
      <path className="or ol" d="M38 66C27 56 28 38 42 26 56 14 78 14 86 30c8 16-4 36-22 40-10 2-20 2-26-4Z" />
      <path className="ord" d="M86 30c8 16-4 36-22 40 9-8 14-24 7-36 6 0 11-2 15-4Z" />
      <path className="w" d="M42 33c5-8 15-12 23-12-8 4-15 8-19 17Z" opacity=".9" />
    </Svg>
  ),

  /** أسماك — سمكة بعين وخياشيم */
  wave: (p) => (
    <Svg {...p}>
      <path className="bl ol" d="M9 52C23 30 53 26 73 44L92 29 87 52 92 73 73 59C53 77 23 74 9 52Z" />
      <path className="bll" d="M12 55c14 11 38 15 58 3l4 3C54 77 24 76 12 55Z" />
      <path className="bld ol" d="M40 33 52 19 63 37Z" />
      <path className="ln" d="M42 41c-5 7-5 17 0 24" />
      <path className="ln" d="M76 46 83 52 76 57" />
      <circle className="w" cx="26" cy="49" r="5.4" />
      <circle className="k" cx="26.6" cy="49.4" r="3.4" />
      <path className="ln" d="M52 48c2 1.6 2 5 0 6.4M60 47c2 1.6 2 5 0 6.4" />
    </Svg>
  ),

  /** ألبان — زجاجة لبن بغطاء وملصق */
  drop: (p) => (
    <Svg {...p}>
      <path className="w ol" d="M36 24h28v9c10 4 16 12 16 24v26c0 6-4 10-10 10H30c-6 0-10-4-10-10V57c0-12 6-20 16-24Z" />
      <path className="bll" d="M27 58c0-8 3-14 9-18v46c-6 0-9-3-9-8Z" />
      <rect className="bl ol" x="33" y="9" width="34" height="14" rx="3.5" />
      <rect className="bl ol" x="27" y="57" width="46" height="27" rx="5" />
      <path className="w" d="M50 63c5 6 7 9 7 12a7 7 0 0 1-14 0c0-3 2-6 7-12Z" />
    </Svg>
  ),

  /** مخبوزات — رغيف بشقوق */
  wheat: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M10 60C10 38 28 24 50 24s40 14 40 36c0 9-6 15-15 15H25c-9 0-15-6-15-15Z" />
      <path className="br" d="M14 63h72c0 7-5 12-12 12H26c-7 0-12-5-12-12Z" />
      <path className="brx ol" d="M27 46 39 35l5 5-12 11Z" />
      <path className="brx ol" d="M45 42 57 31l5 5-12 11Z" />
      <path className="brx ol" d="M63 46 75 35l5 5-12 11Z" />
      <path className="w" d="M18 56c1-8 6-14 13-18-4 5-6 11-6 18Z" opacity=".8" />
    </Svg>
  ),

  /** حلويات — شريحة كيك وكرزة */
  cake: (p) => (
    <Svg {...p}>
      <rect className="brl ol" x="14" y="50" width="72" height="38" rx="5" />
      <rect className="cr" x="15.5" y="63" width="69" height="8" />
      <path className="ln" d="M14.5 63h71M14.5 71h71" />
      <path className="pk ol" d="M14 52c0-7 7-9 11-6 3-7 12-7 15 0 4-7 13-7 16 0 4-7 13-6 15 0 4-3 15-1 15 6Z" />
      <circle className="rd ol" cx="50" cy="31" r="9.5" />
      <path className="ln" style={{ strokeWidth: 3 }} d="M50 22c1-6 6-10 11-11" />
      <circle className="w" cx="46.4" cy="27.6" r="2.2" />
      <path className="w" d="M24 55h6v3h-6ZM66 56h6v3h-6Z" />
    </Svg>
  ),

  /** بقالة — برطمان مربّى بملصق */
  jar: (p) => (
    <Svg {...p}>
      <path className="w ol" d="M30 25h40c6 0 10 4 10 10v46c0 6-4 10-10 10H30c-6 0-10-4-10-10V35c0-6 4-10 10-10Z" />
      <path className="rd" d="M23 49h54v32c0 5-3 8-8 8H31c-5 0-8-3-8-8Z" />
      <rect className="yl ol" x="27" y="9" width="46" height="16" rx="4.5" />
      <path className="ln" d="M36 13v8M44 13v8M52 13v8M60 13v8" />
      <rect className="cr ol" x="31" y="45" width="38" height="28" rx="4" />
      <path className="ln" d="M38 55h24M38 63h16" />
      <rect className="w" x="25" y="36" width="5" height="40" rx="2.5" opacity=".85" />
    </Svg>
  ),

  /** زيوت — زجاجة زيت زيتون وغصن */
  olive: (p) => (
    <Svg {...p}>
      <path className="gn ol" d="M43 30h14l8 14c4 6 4 10 4 16v24c0 6-4 10-10 10H41c-6 0-10-4-10-10V60c0-6 0-10 4-16Z" />
      <rect className="br ol" x="43" y="5" width="14" height="12" rx="2.5" />
      <rect className="gnl ol" x="43" y="16" width="14" height="16" rx="2" />
      <rect className="cr ol" x="36" y="57" width="28" height="24" rx="4" />
      <ellipse className="gnd" cx="50" cy="69" rx="5" ry="7" />
      <path className="ln" d="M50 62c0-3 1-4 3-5" />
      <path className="gnl ol" d="M70 74c10-8 20-8 24-4-5 8-14 10-24 4Z" />
      <path className="gnl ol" d="M74 86c8-9 16-12 21-9-3 9-12 13-21 9Z" />
      <ellipse className="gnd ol" cx="82" cy="90" rx="4.6" ry="6" transform="rotate(20 82 90)" />
    </Svg>
  ),

  /** مشروبات — زجاجة مياه بغطاء وملصق */
  bottle: (p) => (
    <Svg {...p}>
      <rect className="bld ol" x="39" y="5" width="22" height="11" rx="2.5" />
      <path className="bll ol" d="M42 16h16v10c7 7 21 12 21 28v30c0 6-4 10-10 10H31c-6 0-10-4-10-10V54c0-16 14-21 21-28Z" />
      <path className="bl ol" d="M21 50h58v28H21Z" />
      <path className="w" d="M28 64c5-6 9 6 14 0s9 6 14 0 9 6 14 0v7H28Z" />
      <rect className="w" x="26" y="82" width="5" height="10" rx="2.5" opacity=".85" />
    </Svg>
  ),

  /** قهوة وشاي — فنجان بُخار وحبّة بن */
  bean: (p) => (
    <Svg {...p}>
      <ellipse className="rd ol" cx="50" cy="85" rx="38" ry="8" />
      <path className="w ol" d="M20 43h50l-4 27c-1 9-8 15-17 15h-8c-9 0-16-6-17-15Z" />
      <path className="rd" d="M22 54h46l-1.5 10h-43Z" />
      <ellipse className="brd ol" cx="45" cy="43" rx="25" ry="6.5" />
      <path className="ln" style={{ strokeWidth: 4.4 }} d="M70 49c11-2 15 4 13 10-2 6-8 8-15 8" />
      <path className="ln" style={{ strokeWidth: 3 }} d="M36 31c-5-6 5-9 0-16M53 33c-5-6 5-9 0-16" />
      <ellipse className="br ol" cx="84" cy="79" rx="6" ry="4" transform="rotate(-25 84 79)" />
    </Svg>
  ),

  /** مجمّدات — آيس كريم بالعصا */
  snow: (p) => (
    <Svg {...p}>
      <rect className="brl ol" x="44" y="62" width="12" height="32" rx="6" />
      <path className="pk ol" d="M27 64V37c0-14 10-23 23-23s23 9 23 23v27c0 2-2 4-4 4H31c-2 0-4-2-4-4Z" />
      <path className="brd ol" d="M27 38c0-14 10-23 23-23s23 9 23 23v8c-3 0-4-3-7-3s-4 7-8 7-5-9-9-9-5 8-9 8-5-7-8-7-3 4-5 4Z" />
      <path className="w" d="M34 36h7v3h-7ZM56 28h7v3h-7ZM47 40h7v3h-7ZM62 42h5v3h-5Z" />
      <rect className="w" x="32" y="52" width="5" height="12" rx="2.5" opacity=".85" />
    </Svg>
  ),

  /** شوكولاتة وسناكس — لوح مغلّف جزئيًا */
  cocoa: (p) => (
    <Svg {...p}>
      <rect className="br ol" x="20" y="10" width="60" height="64" rx="4" />
      <path className="ln" d="M40 10v64M60 10v64M20 31.5h60M20 52.5h60" />
      <path className="brl" d="M24 14h13v4H28v13h-4ZM44 14h13v4H48v13h-4ZM64 14h13v4H68v13h-4Z" />
      <path className="brd" d="M37 27v-1h3v6h-3ZM57 27v-1h3v6h-3Z" />
      <path className="yl ol" d="M16 64l6-9 10 7 10-9 10 9 10-7 10 9 6-6v35H16Z" />
      <path className="ln" d="M22 80h56M22 88h38" />
    </Svg>
  ),

  /** صحي وعضوي — نصف أفوكادو */
  sprout: (p) => (
    <Svg {...p}>
      <path className="gnd ol" d="M50 7c14 0 21 16 23 28 3 6 8 13 8 25 0 18-13 32-31 32S19 78 19 60c0-12 5-19 8-25C29 23 36 7 50 7Z" />
      <path className="gnl" d="M50 15c10 0 15 13 16 24 3 5 8 11 8 21 0 15-10 26-24 26S26 75 26 60c0-10 5-16 8-21 1-11 6-24 16-24Z" />
      <circle className="br ol" cx="50" cy="62" r="15" />
      <path className="w" d="M41 57c2-5 6-8 11-8-4 2-7 5-8 10Z" />
      <Spark x={78} y={20} s={6} cls="yl" />
    </Svg>
  ),

  /** الأطفال — دبدوب */
  bear: (p) => (
    <Svg {...p}>
      <circle className="brl ol" cx="24" cy="26" r="14" />
      <circle className="brl ol" cx="76" cy="26" r="14" />
      <circle className="pkl" cx="24" cy="26" r="6.5" />
      <circle className="pkl" cx="76" cy="26" r="6.5" />
      <circle className="brl ol" cx="50" cy="54" r="36" />
      <ellipse className="cr ol" cx="50" cy="66" rx="17" ry="13" />
      <ellipse className="k" cx="50" cy="59.5" rx="5.4" ry="3.8" />
      <path className="ln" d="M50 63v6M43 71c3 3.5 11 3.5 14 0" />
      <circle className="k" cx="36" cy="46" r="3.8" />
      <circle className="k" cx="64" cy="46" r="3.8" />
      <circle className="w" cx="37.2" cy="44.8" r="1.2" />
      <circle className="w" cx="65.2" cy="44.8" r="1.2" />
      <circle className="pk" cx="27" cy="58" r="4" opacity=".7" />
      <circle className="pk" cx="73" cy="58" r="4" opacity=".7" />
    </Svg>
  ),

  /** العناية الشخصية — زجاجة عطر */
  flower: (p) => (
    <Svg {...p}>
      <rect className="yl ol" x="38" y="6" width="24" height="15" rx="3.5" />
      <rect className="gy ol" x="44" y="20" width="12" height="9" />
      <path className="pul ol" d="M28 30h44c5 0 9 4 9 9v43c0 5-4 9-9 9H28c-5 0-9-4-9-9V39c0-5 4-9 9-9Z" />
      <path className="pu" d="M23 55h54v27c0 3-2 5-5 5H28c-3 0-5-2-5-5Z" />
      <rect className="cr ol" x="35" y="46" width="30" height="24" rx="4" />
      <path className="ln" d="M41 55h18M41 62h12" />
      <Spark x={30} y={42} s={5} />
      <Spark x={88} y={14} s={6} cls="yl" />
    </Svg>
  ),

  /** المنزل والتنظيف — إسفنجة وفقاعات */
  bubble: (p) => (
    <Svg {...p}>
      <g transform="rotate(-8 50 70)">
        <rect className="yl ol" x="16" y="52" width="68" height="34" rx="8" />
        <path className="gn ol" d="M16 62v-2c0-5 3-8 8-8h52c5 0 8 3 8 8v2Z" />
        <circle className="ln" cx="30" cy="74" r="3.5" />
        <circle className="ln" cx="48" cy="77" r="2.6" />
        <circle className="ln" cx="64" cy="72" r="3.8" />
        <circle className="ln" cx="74" cy="80" r="2.2" />
      </g>
      <circle className="bll ol" cx="32" cy="30" r="14" />
      <circle className="bll ol" cx="62" cy="20" r="9" />
      <circle className="bll ol" cx="80" cy="38" r="7" />
      <path className="ln" d="M24 26c1-4 4-7 8-8M58 16c1-2 3-3 5-3" />
    </Svg>
  ),

  /** احتياطي لأي قسم بلا رسمة — سلّة خضار */
  basket: (p) => (
    <Svg {...p}>
      <circle className="rd ol" cx="36" cy="38" r="13" />
      <circle className="or ol" cx="62" cy="34" r="11" />
      <path className="gn ol" d="M48 22c0-6 4-9 9-10-1 6-4 9-9 10Z" />
      <path className="brl ol" d="M10 48h80l-9 40c-1 3-3 5-6 5H25c-3 0-5-2-6-5Z" />
      <path className="ln" d="M24 56l5 32M42 56l2 34M58 56l-2 34M76 56l-5 32M14 66h72M18 80h64" />
    </Svg>
  ),
};

/** مكوّن الرسمة المناسبة لمفتاح القسم — مع احتياطي آمن */
export function getArt(key) {
  return ART[key] || ART.basket;
}

/**
 * ═══ علامة رُمّان: رمّانة بتاج أصفر وثلاث حبّات ═══════════════════
 * ثلاث الحبّات = «أقسام كثيرة تحت قشرة واحدة» — جوهر فكرة البراند.
 * الحدّ يتبع `--rule` فيصير كريميًا في الوضع الليلي وتبقى مقروءة.
 */
export const Fruit = ({ size = 40, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
    <path d="M32 14c14 0 24 10 24 23S46 58 32 58 8 50 8 37 18 14 32 14Z"
          fill="var(--ruby-500)" stroke="var(--rule)" strokeWidth="3.6" strokeLinejoin="round" />
    <path d="M17 31c2-6 6-10 12-12" stroke="#FFF8E8" strokeWidth="2.8" strokeLinecap="round" opacity=".75" />
    <path d="M23 17l2-9 4 5 3-7 3 7 4-5 2 9Z"
          fill="var(--gold-400)" stroke="var(--rule)" strokeWidth="3.2" strokeLinejoin="round" />
    <circle cx="24" cy="37" r="3.7" fill="#FFF8E8" />
    <circle cx="40" cy="37" r="3.7" fill="#FFF8E8" />
    <circle cx="32" cy="47.5" r="3.7" fill="#FFF8E8" />
  </svg>
);

/**
 * ═══ رمّانة مفتوحة — رسم البطل ═════════════════════════════════
 * الحبّات تُولَّد برمجيًا في حلقات حول القلب، بإزاحة ثابتة (بذرة
 * عشوائية معروفة) لتبدو مرتّبة باليد لا بالمسطرة، وتُنتج النتيجة
 * نفسها في كل تحميل. الأغشية البيضاء (الحجرات) تفصل بين الأقسام —
 * وهذا هو معنى «قشرة واحدة تضمّ حبّاتٍ كثيرة».
 */
export function OpenFruit({ size = 360, ...props }) {
  const seeds = [];
  let s = 11;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const cx = 100;
  const cy = 106;
  /* حلقات من الحبّات: نصف القطر، العدد، حجم الحبّة */
  [[66, 17, 9.4], [46, 12, 8.6], [27, 7, 7.6], [9, 3, 6.4]].forEach(([r, n, size_], ring) => {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + ring * 0.42 + (rand() - 0.5) * 0.18;
      const rr = r + (rand() - 0.5) * 3;
      seeds.push({
        x: cx + Math.cos(a) * rr,
        y: cy + Math.sin(a) * rr,
        rot: (a * 180) / Math.PI + 90 + (rand() - 0.5) * 24,
        w: size_ * (0.92 + rand() * 0.2),
        h: size_ * (1.18 + rand() * 0.2),
      });
    }
  });

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true" {...props}>
      {/* القشرة */}
      <circle cx={cx} cy={cy} r="88" fill="var(--ruby-600)" stroke="var(--rule)" strokeWidth="5" />
      <circle cx={cx} cy={cy} r="80" fill="var(--gold-100)" stroke="var(--rule)" strokeWidth="2.4" />
      {/* الأغشية البيضاء */}
      <g stroke="var(--paper-deep)" strokeWidth="4" strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2 + 0.2;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * 78} y2={cy + Math.sin(a) * 78} />;
        })}
      </g>
      {/* الحبّات */}
      {seeds.map((seed, i) => (
        <g key={i} transform={`translate(${seed.x.toFixed(1)} ${seed.y.toFixed(1)}) rotate(${seed.rot.toFixed(0)})`}>
          <ellipse rx={seed.w} ry={seed.h} fill="var(--ruby-500)" stroke="var(--ruby-800)" strokeWidth="1.6" />
          <ellipse cx={-seed.w * 0.32} cy={-seed.h * 0.36} rx={seed.w * 0.26} ry={seed.h * 0.2} fill="#FFF8E8" opacity=".85" />
        </g>
      ))}
      {/* التاج */}
      <path d="M72 30 78 8 92 22 100 2 108 22 122 8 128 30Z"
            fill="var(--gold-400)" stroke="var(--rule)" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

/** رؤوس نجمة الخصم (16 رأسًا) — محسوبة مرة واحدة */
const BURST_POINTS = '50,3 57.8,10.8 68,6.6 72.2,16.7 83.2,16.8 83.3,27.8 93.4,32 89.2,42.2 97,50 89.2,57.8 93.4,68 83.3,72.2 83.2,83.2 72.2,83.3 68,93.4 57.8,89.2 50,97 42.2,89.2 32,93.4 27.8,83.3 16.8,83.2 16.7,72.2 6.6,68 10.8,57.8 3,50 10.8,42.2 6.6,32 16.7,27.8 16.8,16.8 27.8,16.7 32,6.6 42.2,10.8';

/**
 * نجمة الخصم — الشكل الذي لا يخطئه أحد في أي منشور عروض.
 * `tone`: brand (أحمر) · sun (أصفر) · leaf (أخضر) · ink (حبر)
 * الحدّ والتدوير جزء من الشكل؛ المحتوى يُمرَّر أطفالًا.
 */
export const Burst = ({ children, size = 72, tone = 'brand', className = '', style, ...rest }) => (
  <span className={`burst burst--${tone} ${className}`.trim()} style={{ '--burst': `${size}px`, ...style }} {...rest}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points={BURST_POINTS} /></svg>
    <span className="burst__text">{children}</span>
  </span>
);

/** حبّة رمّان مفردة — تُستخدم كنقطة تعداد وعنصر زينة صغير */
export const Aril = ({ size = 12, color = 'currentColor', ...props }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 12 15" aria-hidden="true" {...props}>
    <path d="M6 1c3.4 0 5.4 3.2 5.4 6.4S9.4 14 6 14 .6 10.6.6 7.4 2.6 1 6 1Z" fill={color} />
    <ellipse cx="4" cy="4.6" rx="1.3" ry="1.9" fill="#FFF8E8" opacity=".7" transform="rotate(14 4 4.6)" />
  </svg>
);
