/**
 * ═══════════════════════════════════════════════════════════════
 *  ستيكرات الأصناف — رسومات خاصة بالمنتج نفسه
 *
 *  ستيكر القسم (lib/art.jsx) يقول «هذا خضار». هذا الملف يقول «هذه
 *  رمّانة». يُختار الستيكر من **اسم المنتج** بالعربية عبر قواعد بسيطة،
 *  فإن لم يطابق شيئًا عدنا إلى ستيكر قسمه — فلا يخلو منتج من رسمة،
 *  ولا يُحرَم مدير المتجر من إدخال أسماء حرّة.
 *
 *  كل الرسوم في مربّع 100×100 وبألوان الطعام الحقيقية (انظر print.css).
 * ═══════════════════════════════════════════════════════════════
 */
import { Svg, Spark, ART } from './art.jsx';

export const ITEM_ART = {
  /* ─── فاكهة وخضار ─────────────────────────────────────────── */
  pomegranate: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M50 25C74 23 91 39 90 60 89 80 72 93 50 93 28 93 11 80 10 60 9 39 26 23 50 25Z" />
      <path className="rdd" d="M81 49c6 17-2 34-20 41-5 2-9 3-12 3 21-4 31-21 27-44h5Z" />
      <path className="w" d="M21 58c1-10 6-18 14-22-4 6-7 13-7 22Z" opacity=".85" />
      <path className="rdd ol" d="M37 28 40 13 46 21 50 9 54 21 60 13 63 28Z" />
      <path className="ln" d="M44 48c-2 8-2 16 1 24" />
    </Svg>
  ),
  orange: (p) => (
    <Svg {...p}>
      <circle className="or ol" cx="50" cy="57" r="36" />
      <path className="ord" d="M80 42c8 20 0 40-22 49 20-3 33-18 31-40-.4-4-4-7-9-9Z" />
      <path className="w" d="M22 54c1-12 8-22 19-26-6 7-9 16-9 26Z" opacity=".85" />
      <circle className="ord" cx="50" cy="25" r="3.2" />
      <path className="gn ol" d="M50 23c2-10 12-15 22-12-1 10-11 16-22 12Z" />
      <circle className="ord" cx="36" cy="62" r="1.8" /><circle className="ord" cx="58" cy="74" r="1.8" /><circle className="ord" cx="66" cy="54" r="1.8" />
    </Svg>
  ),
  lemon: (p) => (
    <Svg {...p}>
      <path className="yl ol" d="M7 54c0-5 4-8 9-9 4-12 17-19 34-19s30 7 34 19c5 1 9 4 9 9s-4 8-9 9c-4 12-17 19-34 19S20 75 16 63c-5-1-9-4-9-9Z" />
      <path className="yld" d="M73 68c-6 8-16 12-27 12 15 0 28-6 35-18 3-1 6-2 8-3-2 4-7 7-16 9Z" />
      <path className="w" d="M24 46c4-8 12-12 22-13-8 3-14 8-17 14Z" opacity=".85" />
      <path className="gn ol" d="M53 27c2-8 10-13 18-10-1 9-9 14-18 10Z" />
    </Svg>
  ),
  banana: (p) => (
    <Svg {...p}>
      <path className="yl ol" d="M16 20C10 70 52 94 92 76L90 67C60 80 33 58 34 18Z" />
      <path className="ln" d="M24 24c0 32 26 52 62 47" />
      <rect className="br ol" x="11" y="9" width="27" height="13" rx="4" />
      <circle className="brd" cx="91" cy="73" r="3.6" />
      <path className="w" d="M40 30c0 10 3 18 8 24" style={{ stroke: '#fff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', opacity: 0.7 }} />
    </Svg>
  ),
  carrot: (p) => (
    <Svg {...p}>
      <path className="gn ol" d="M72 24C64 14 66 4 72 2 78 8 78 18 72 24Z" />
      <path className="gn ol" d="M76 24C86 18 96 22 98 30 90 34 82 32 76 24Z" />
      <path className="gnl ol" d="M74 22C76 10 88 6 94 10 92 18 84 24 74 22Z" />
      <path className="or ol" d="M58 22C74 14 88 28 82 44L30 92C24 96 18 90 22 84L52 28C53 25 55 23 58 22Z" />
      <path className="ln" d="M64 38l12 6M55 52l12 6M46 64l11 5M38 76l9 4" />
      <path className="w" d="M62 27c6-3 12 0 14 6-4-3-9-4-14-6Z" opacity=".7" />
    </Svg>
  ),
  grapes: (p) => (
    <Svg {...p}>
      <path className="ln" style={{ strokeWidth: 4 }} d="M50 34c0-8 2-14 7-19" />
      <path className="gn ol" d="M54 18c4-8 14-10 22-6-2 9-12 13-22 6Z" />
      {[[26, 40], [42, 38], [58, 38], [74, 40], [34, 54], [50, 52], [66, 54], [42, 68], [58, 68], [50, 82]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle className="pu ol" cx={x} cy={y} r="11" />
          <circle className="w" cx={x - 3.6} cy={y - 3.6} r="2.6" opacity=".8" />
        </g>
      ))}
    </Svg>
  ),
  strawberry: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M50 91C24 77 12 55 14 41c2-12 16-16 36-8 20-8 34-4 36 8 2 14-10 36-36 50Z" />
      <path className="rdd" d="M72 48c0 14-8 28-22 38 20-10 32-30 31-44-3 0-6 3-9 6Z" />
      {[[32, 48], [46, 54], [60, 48], [38, 64], [54, 68], [68, 58], [48, 80], [28, 38]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} className="yl" cx={x} cy={y} rx="2.2" ry="3.2" />
      ))}
      <path className="gn ol" d="M50 34 38 20 46 25 50 12 54 25 62 20Z" />
      <path className="gn ol" d="M28 32c6-2 12 0 16 4-6 3-12 2-16-4Z" />
      <path className="gn ol" d="M72 32c-6-2-12 0-16 4 6 3 12 2 16-4Z" />
    </Svg>
  ),
  apple: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M50 33C58 23 74 23 83 37c9 15 3 41-14 51-7 4-13 3-19 1-6 2-12 3-19-1C16 78 10 52 19 37 28 23 42 23 50 33Z" />
      <path className="rdd" d="M82 41c6 18-2 38-18 46 14-8 20-26 15-44l3-2Z" />
      <path className="w" d="M24 51c1-9 6-16 13-19-4 6-6 12-5 20Z" opacity=".85" />
      <path className="ln" style={{ strokeWidth: 4 }} d="M50 33c0-8 3-14 8-18" />
      <path className="gn ol" d="M56 23c4-8 14-10 22-6-2 9-12 13-22 6Z" />
    </Svg>
  ),
  potato: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M16 56C12 36 32 22 58 24c26 2 36 20 29 40-6 18-30 28-50 22C24 82 18 70 16 56Z" />
      <path className="br" d="M80 44c6 16-2 32-20 38-6 2-12 3-18 2 22 2 40-14 38-40Z" />
      <circle className="brd" cx="36" cy="46" r="2.4" /><circle className="brd" cx="58" cy="38" r="2.4" />
      <circle className="brd" cx="66" cy="62" r="2.4" /><circle className="brd" cx="42" cy="68" r="2.4" />
      <path className="w" d="M24 52c1-8 6-14 14-17-4 5-7 11-7 18Z" opacity=".5" />
    </Svg>
  ),
  onion: (p) => (
    <Svg {...p}>
      <path className="pk ol" d="M50 12c3 10 8 14 16 22 18 16 20 40 2 51-7 4-15 5-18 5s-11-1-18-5C14 74 16 50 34 34c8-8 13-12 16-22Z" />
      <path className="pkd" d="M70 40c10 18 6 38-10 46 14-8 20-26 14-42Z" />
      <path className="ln" d="M50 16c-8 22-8 48 0 74M50 16c-18 22-20 48-8 72M50 16c18 22 20 48 8 72" />
      <path className="ln" d="M44 90l-3 8M50 92v8M56 90l3 8" />
      <path className="w" d="M30 46c2-6 6-10 11-13-3 5-5 10-4 16Z" opacity=".7" />
    </Svg>
  ),
  cucumber: (p) => (
    <Svg {...p}>
      <g transform="rotate(-24 46 54)">
        <rect className="gn ol" x="6" y="40" width="80" height="28" rx="14" />
        <path className="gnd" d="M14 60c10 6 54 6 66 0l3-4c-12 8-58 8-72 0Z" opacity=".6" />
        <path className="ln" style={{ stroke: '#237A3E' }} d="M24 44v6M38 44v6M54 44v6M68 44v6" />
      </g>
      <circle className="gnl ol" cx="72" cy="75" r="17" />
      <circle className="cr" cx="72" cy="75" r="11" />
      <circle className="gnl" cx="68" cy="73" r="2" /><circle className="gnl" cx="74" cy="71" r="2" /><circle className="gnl" cx="72" cy="79" r="2" />
    </Svg>
  ),
  pepper: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M32 36C32 26 42 25 50 29c8-4 18-3 18 7 14 6 18 24 11 39-5 11-17 17-29 17S27 86 21 75C14 60 18 42 32 36Z" />
      <path className="rdd" d="M72 44c8 14 6 30-4 40-5 5-12 7-18 8 16-3 28-18 22-48Z" />
      <path className="ln" d="M40 42c-4 14-4 30 2 44M60 42c4 14 4 30-2 44" />
      <path className="w" d="M24 56c1-8 5-14 11-18-3 6-5 12-4 20Z" opacity=".8" />
      <path className="gn ol" d="M42 29c0-8 4-14 8-16 4 2 8 8 8 16-4 2-12 2-16 0Z" />
    </Svg>
  ),
  eggplant: (p) => (
    <Svg {...p}>
      <path className="pu ol" d="M58 22C84 28 92 54 74 76 62 90 42 96 30 86 18 76 26 56 38 42 44 34 46 24 58 22Z" />
      <path className="pud" d="M74 52c4 14-2 28-14 36-6 4-14 6-20 5 20 2 38-16 34-41Z" />
      <path className="w" d="M34 66c2-8 8-14 14-17-3 6-4 12-3 20Z" opacity=".7" />
      <path className="gn ol" d="M52 25c-2-8 4-14 12-14 4 6 2 14-4 18-4 0-8-2-8-4Z" />
      <path className="gn ol" d="M46 29c-8-2-14 2-16 10 8 2 14-2 16-10Z" />
    </Svg>
  ),
  watermelon: (p) => (
    <Svg {...p}>
      <path className="gn ol" d="M8 40h84c0 26-18 48-42 48S8 66 8 40Z" />
      <path className="gnl" d="M15 40h70c0 22-15 40-35 40S15 62 15 40Z" />
      <path className="rd" d="M21 40h58c0 18-12 34-29 34S21 58 21 40Z" />
      {[[36, 50, -20], [50, 58, 0], [64, 50, 20], [43, 66, -10], [58, 68, 10]].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} className="k" cx={x} cy={y} rx="2.4" ry="4" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path className="ln" d="M8 40h84" />
    </Svg>
  ),
  herbs: (p) => (
    <Svg {...p}>
      {[-30, -15, 0, 15, 30].map((a, i) => (
        <path key={a} className={`${i % 2 ? 'gnl' : 'gn'} ol`} d="M50 80C36 63 34 34 50 12c16 22 14 51 0 68Z" transform={`rotate(${a} 50 80)`} />
      ))}
      <path className="ln" d="M50 80V28" style={{ stroke: '#237A3E' }} />
      <rect className="or ol" x="39" y="68" width="22" height="14" rx="3" />
      <path className="ln" d="M46 82l-4 14M54 82l4 14" />
    </Svg>
  ),

  /* ─── لحوم وأسماك ──────────────────────────────────────────── */
  steak: (p) => (
    <Svg {...p}>
      <path className="cr ol" d="M14 44C14 26 38 16 60 20c22 4 32 22 26 42-6 20-28 28-46 22C22 78 14 62 14 44Z" />
      <path className="rd" d="M22 46C22 32 40 25 58 28c18 4 26 18 22 34-5 16-22 22-36 18-14-4-22-18-22-34Z" />
      <path className="rdd" d="M60 60c8-2 14-8 16-16 2 14-6 28-24 32 4-4 8-10 8-16Z" opacity=".55" />
      <path className="ln" style={{ stroke: '#FFC4D3', strokeWidth: 2.6 }} d="M34 40c8-6 18-6 24 0M30 56c10-4 22-2 28 6M52 36c6 2 10 6 12 10" />
      <ellipse className="w ol" cx="66" cy="62" rx="9" ry="7" />
      <ellipse className="cr" cx="66" cy="62" rx="4" ry="3" />
    </Svg>
  ),
  shrimp: (p) => (
    <Svg {...p}>
      <path className="or ol" d="M72 18C92 22 94 56 74 72 60 84 32 86 18 70c-4-4 0-10 6-8 12 10 32 8 42-2 10-10 8-22 0-28-4-4-2-12 6-14Z" />
      <path className="ln" d="M80 30c4 8 4 18-2 26M70 40c4 6 4 14 0 20M58 52c2 4 0 10-4 12" />
      <path className="ord ol" d="M18 70 8 84l14-4 4 10 8-12Z" />
      <circle className="k" cx="74" cy="27" r="3" />
      <path className="ln" d="M76 20c6-8 14-10 20-8M72 18c2-8 8-14 16-14" />
    </Svg>
  ),

  /* ─── ألبان وبيض ───────────────────────────────────────────── */
  egg: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M66 30c14 0 24 18 24 34 0 14-10 24-24 24S42 78 42 64c0-16 10-34 24-34Z" />
      <path className="w" d="M54 62c0-10 4-20 10-26-6 4-12 12-12 26 0 6 2 10 5 14Z" opacity=".55" />
      <path className="w ol" d="M34 14c16 0 26 22 26 40 0 16-12 28-26 28S8 70 8 54c0-18 10-40 26-40Z" />
      <path className="gy" d="M44 24c8 10 12 26 8 40-3 9-9 15-16 18 12-2 22-14 22-28 0-12-6-24-14-30Z" opacity=".5" />
      <path className="w" d="M18 52c0-12 4-22 12-28-6 6-8 16-8 28Z" />
    </Svg>
  ),
  cheese: (p) => (
    <Svg {...p}>
      <path className="yl ol" d="M8 72 90 28v44c0 3-2 5-5 5H13c-6 0-8-3-5-5Z" />
      <path className="yll" d="M16 70 82 34v7L22 74Z" />
      <circle className="yld ol" style={{ strokeWidth: 2 }} cx="62" cy="58" r="6" />
      <circle className="yld ol" style={{ strokeWidth: 2 }} cx="78" cy="50" r="4" />
      <circle className="yld ol" style={{ strokeWidth: 2 }} cx="40" cy="67" r="4.4" />
      <circle className="yld ol" style={{ strokeWidth: 2 }} cx="72" cy="68" r="4" />
    </Svg>
  ),
  yogurt: (p) => (
    <Svg {...p}>
      <path className="w ol" d="M24 36h52l-6 52c0 3-3 5-6 5H36c-3 0-6-2-6-5Z" />
      <rect className="bl ol" x="20" y="24" width="60" height="14" rx="4" />
      <path className="rd" d="M27 56h46l-2 14H29Z" />
      <path className="ln" d="M33 47h34" />
      <path className="bll" d="M33 42l-3 44c0 2 1 3 3 3h3L40 42Z" opacity=".7" />
      <circle className="w" cx="50" cy="63" r="4" />
    </Svg>
  ),
  butter: (p) => (
    <Svg {...p}>
      <path className="yll ol" d="M14 42 28 28H84L70 42Z" />
      <path className="yl ol" d="M14 42H70V78H14Z" />
      <path className="yld ol" d="M70 42 84 28V64L70 78Z" />
      <path className="w ol" d="M14 54H70V78H14Z" />
      <path className="ln" d="M22 63h36M22 70h22" />
      <path className="rd" d="M14 54h9v24h-9Z" />
    </Svg>
  ),

  /* ─── مخبوزات ──────────────────────────────────────────────── */
  croissant: (p) => (
    <Svg {...p}>
      <ellipse className="brl ol" cx="16" cy="70" rx="11" ry="9" transform="rotate(-55 16 70)" />
      <ellipse className="brl ol" cx="84" cy="70" rx="11" ry="9" transform="rotate(55 84 70)" />
      <ellipse className="brl ol" cx="29" cy="54" rx="16" ry="14" transform="rotate(-35 29 54)" />
      <ellipse className="brl ol" cx="71" cy="54" rx="16" ry="14" transform="rotate(35 71 54)" />
      <ellipse className="brl ol" cx="50" cy="46" rx="22" ry="18" />
      <path className="br" d="M34 54c4 6 10 9 16 9s12-3 16-9c-1 10-8 16-16 16s-15-6-16-16Z" opacity=".65" />
      <path className="ln" d="M40 36c2 8 2 16 0 24M60 36c-2 8-2 16 0 24" />
      <path className="w" d="M36 36c3-4 8-6 13-6-5 2-9 5-11 9Z" opacity=".8" />
    </Svg>
  ),
  toast: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M18 38C10 28 16 12 34 14c8-6 24-6 32 0 18-2 24 14 16 24 4 8 2 40-2 50H20c-4-10-6-42-2-50Z" />
      <path className="brx" d="M27 41c-3-8 2-16 12-16 8-4 16-4 24 0 10 0 14 8 12 16 3 8 3 30 0 38H27c-3-8-3-30 0-38Z" />
      <path className="w" d="M36 36c3-4 8-6 13-6" style={{ stroke: '#fff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', opacity: 0.8 }} />
    </Svg>
  ),

  /* ─── بقالة ومشروبات وحلويات ───────────────────────────────── */
  rice: (p) => (
    <Svg {...p}>
      <path className="cr ol" d="M30 22c0-6 10-10 20-10s20 4 20 10l12 64c1 6-4 10-10 10H28c-6 0-11-4-10-10Z" />
      <path className="ln" d="M32 24c4 5 12 7 18 7s14-2 18-7" />
      <rect className="rd ol" x="30" y="44" width="40" height="30" rx="4" />
      <path className="ln" style={{ stroke: '#fff' }} d="M38 55h24M38 64h16" />
      <ellipse className="w ol" cx="82" cy="90" rx="4" ry="2.4" transform="rotate(-20 82 90)" />
      <ellipse className="w ol" cx="90" cy="84" rx="4" ry="2.4" transform="rotate(25 90 84)" />
    </Svg>
  ),
  nuts: (p) => (
    <Svg {...p}>
      <circle className="brl ol" cx="38" cy="56" r="26" />
      <path className="br" d="M18 64c8 12 24 16 38 8-6 14-26 20-38 8-6-6-6-12 0-16Z" opacity=".55" />
      <path className="ln" d="M38 30c-4 16-4 36 0 52M24 40c10 4 20 4 28 0M24 72c10-4 20-4 28 0" />
      <path className="brx ol" d="M70 40C82 46 88 62 80 78 76 84 68 84 64 78 58 64 62 46 70 40Z" />
      <path className="brx ol" d="M56 12C68 14 76 26 72 38 68 42 62 42 58 38 52 30 52 18 56 12Z" />
      <path className="ln" d="M70 46c4 10 4 22 0 30M58 18c3 6 4 14 2 18" />
    </Svg>
  ),
  honey: (p) => (
    <Svg {...p}>
      <path className="w ol" d="M28 28h44c8 0 14 6 14 14v38c0 8-6 14-14 14H28c-8 0-14-6-14-14V42c0-8 6-14 14-14Z" />
      <path className="or" d="M19 44h62v36c0 5-4 9-9 9H28c-5 0-9-4-9-9Z" />
      <path className="orl" d="M19 44h62v8H19Z" opacity=".7" />
      <rect className="br ol" x="26" y="13" width="48" height="17" rx="5" />
      <rect className="cr ol" x="30" y="53" width="40" height="27" rx="4" />
      <path className="ln" d="M38 63h24M38 71h14" />
      <path className="or ol" d="M66 30c0 6 2 10 2 14a4 4 0 0 1-8 0c0-4 2-8 2-14Z" />
    </Svg>
  ),
  juice: (p) => (
    <Svg {...p}>
      <path className="or ol" d="M24 32h48v56c0 3-2 5-5 5H29c-3 0-5-2-5-5Z" />
      <path className="orl ol" d="M24 32 34 20H62L72 32Z" />
      <path className="ln" style={{ strokeWidth: 6 }} d="M52 22 60 6 78 4" />
      <path className="ln" style={{ stroke: '#FFF8E8', strokeWidth: 2.4 }} d="M52 22 60 6 78 4" />
      <circle className="yl ol" cx="48" cy="64" r="16" />
      <path className="ln" style={{ strokeWidth: 2 }} d="M48 48v32M32 64h32M37 53l22 22M59 53 37 75" />
    </Svg>
  ),
  can: (p) => (
    <Svg {...p}>
      <path className="rd ol" d="M26 22h48v66c0 4-4 8-8 8H34c-4 0-8-4-8-8Z" />
      <ellipse className="gy ol" cx="50" cy="22" rx="24" ry="7" />
      <ellipse className="gyd" cx="50" cy="22" rx="14" ry="3.6" />
      <path className="w" d="M26 50h48v22H26Z" />
      <path className="ln" d="M34 61h32" />
      <path className="ln" style={{ stroke: '#fff', strokeWidth: 3, opacity: 0.7 }} d="M32 30c-1 14-1 40 0 54" />
    </Svg>
  ),
  tea: (p) => (
    <Svg {...p}>
      <ellipse className="gy ol" cx="50" cy="88" rx="34" ry="7" />
      <path className="bll ol" d="M24 38h52l-5 42c-1 5-5 8-10 8H39c-5 0-9-3-10-8Z" />
      <path className="or" d="M27 48h46l-3 30c-1 4-4 6-8 6H38c-4 0-7-2-8-6Z" opacity=".92" />
      <path className="ln" style={{ strokeWidth: 4 }} d="M76 48c10-2 14 4 12 12s-8 10-16 10" />
      <path className="ln" style={{ strokeWidth: 3 }} d="M38 30c-5-6 5-9 0-16M54 32c-5-6 5-9 0-16" />
      <path className="gn ol" d="M52 40c0-8 6-12 14-10-1 8-6 12-14 10Z" />
    </Svg>
  ),
  cookie: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M50 12c8 0 12 6 20 6 10 0 14 8 14 16 0 6 6 10 6 18 0 10-8 14-12 22-4 8-12 14-22 14S30 86 22 78c-6-6-12-10-12-22 0-8 6-12 8-20 2-10 10-14 18-16 6-2 8-8 14-8Z" />
      <path className="br" d="M82 56c0 10-8 14-12 22-4 8-12 14-22 14 14-2 30-14 34-36Z" opacity=".55" />
      {[[36, 36, 5], [62, 30, 5], [68, 56, 5.6], [40, 60, 5], [54, 76, 4.6], [26, 52, 4.2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} className="brd" cx={x} cy={y} r={r} />
      ))}
      <path className="w" d="M24 40c2-6 6-10 12-12" style={{ stroke: '#fff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', opacity: 0.6 }} />
    </Svg>
  ),
  cone: (p) => (
    <Svg {...p}>
      <path className="brl ol" d="M30 54 50 95 70 54Z" />
      <path className="ln" d="M37 60 57 86M63 60 43 86M33 70h34" />
      <circle className="pk ol" cx="50" cy="44" r="22" />
      <circle className="cr ol" cx="53" cy="24" r="17" />
      <circle className="rd ol" cx="55" cy="7" r="5.6" />
      <path className="w" d="M36 38c2-6 6-9 11-10" style={{ stroke: '#fff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', opacity: 0.7 }} />
    </Svg>
  ),

  /* ─── عناية ومنزل وأطفال ───────────────────────────────────── */
  shampoo: (p) => (
    <Svg {...p}>
      <path className="gy ol" d="M44 5h22v9H44Z" />
      <path className="gy ol" d="M66 7h14v6H66Z" />
      <rect className="gy ol" x="51" y="13" width="9" height="10" />
      <rect className="w ol" x="38" y="22" width="34" height="12" rx="3" />
      <path className="bl ol" d="M34 34h42c6 0 10 4 10 10v40c0 6-4 10-10 10H34c-6 0-10-4-10-10V44c0-6 4-10 10-10Z" />
      <rect className="cr ol" x="32" y="48" width="46" height="32" rx="4" />
      <path className="gn ol" d="M46 70c0-10 6-16 16-16 0 10-6 16-16 16Z" />
      <path className="bll" d="M29 44v38c-3-2-4-5-4-8V48c0-3 1-4 4-4Z" opacity=".7" />
    </Svg>
  ),
  spray: (p) => (
    <Svg {...p}>
      <path className="gnl ol" d="M30 46h34c6 0 10 4 10 10v32c0 4-3 8-8 8H30c-5 0-8-4-8-8V56c0-6 4-10 8-10Z" />
      <path className="gn" d="M24 68h48v20c0 3-2 6-5 6H29c-3 0-5-3-5-6Z" />
      <rect className="w ol" x="36" y="35" width="22" height="12" />
      <path className="bl ol" d="M28 14h30l12 8v12H28Z" />
      <path className="bld ol" d="M62 32l8 12-5 4" />
      <circle className="bll ol" style={{ strokeWidth: 2 }} cx="82" cy="20" r="4" />
      <circle className="bll ol" style={{ strokeWidth: 2 }} cx="90" cy="30" r="3" />
      <circle className="bll ol" style={{ strokeWidth: 2 }} cx="80" cy="34" r="2.4" />
    </Svg>
  ),
  diaper: (p) => (
    <Svg {...p}>
      <path className="bl ol" d="M14 28h72c4 0 6 3 6 6v52c0 3-2 6-6 6H14c-4 0-6-3-6-6V34c0-3 2-6 6-6Z" />
      <path className="bll ol" d="M12 20h76c3 0 4 3 4 5v6H8v-6c0-2 1-5 4-5Z" />
      <circle className="cr ol" cx="50" cy="60" r="21" />
      <path className="ln" d="M50 38c-4 0-6 3-4 6 3-2 6-2 8 0" />
      <circle className="k" cx="43" cy="58" r="2.6" /><circle className="k" cx="57" cy="58" r="2.6" />
      <path className="ln" d="M44 68c3 3 9 3 12 0" />
      <circle className="pk" cx="38" cy="65" r="3.4" opacity=".7" /><circle className="pk" cx="62" cy="65" r="3.4" opacity=".7" />
      <Spark x={20} y={54} s={5} cls="yl" />
      <Spark x={82} y={52} s={5} cls="yl" />
    </Svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════
   اختيار الستيكر من اسم المنتج
   الترتيب مهم: الأخصّ قبل الأعمّ («جبنة» قبل «لبن»، «كرواسون» قبل «عيش»).
   النتيجة قد تكون ستيكر صنف (ITEM_ART) أو ستيكر قسم (ART) نعيد استخدامه.
   ═══════════════════════════════════════════════════════════════ */

/** توحيد الكتابة: حذف التشكيل، توحيد الألف والياء والتاء المربوطة */
const normalize = (text = '') => String(text)
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .toLowerCase();

/**
 * تُبنى كل قاعدة من جذور تُطابَق عند **بداية الكلمة** (مع السوابق الشائعة
 * ال/ب/و/ك…). هذا يمنع الإيجابيات الكاذبة التي تأتي من تطابق داخل كلمة
 * أخرى، مثل «شطة» داخل «قشطة» أو «روب» داخل «روبيان».
 */
const PREFIX = '(?:ال|وال|بال|كال|فال|لل|و|ب|ل|ك|ف)?';
const w = (...stems) => new RegExp(`(?:^|\\s)${PREFIX}(?:${stems.join('|')})`);

const RULES = [
  ['pomegranate', w('رمان')],
  ['orange', w('برتقال', 'يوسفي', 'مندرين', 'كلمنتين')],
  ['lemon', w('ليمون', 'جريب فروت')],
  ['banana', w('موز')],
  ['carrot', w('جزر')],
  ['grapes', w('عنب')],
  ['strawberry', w('فراول', 'توت')],
  ['apple', w('تفاح', 'كمثري', 'خوخ', 'مشمش', 'جوافه')],
  ['potato', w('بطاطس', 'بطاطا')],
  ['onion', w('بصل', 'ثوم')],
  ['pepper', w('فلفل', 'شطه')],
  ['cucumber', w('خيار', 'كوس', 'قرع', 'باميه')],
  ['eggplant', w('باذنجان')],
  ['watermelon', w('بطيخ', 'شمام', 'كنتالوب')],
  ['herbs', w('نعناع', 'بقدونس', 'جرجير', 'كزبره', 'شبت', 'ريحان', 'خس', 'سبانخ', 'ملوخيه', 'كرفس')],
  ['leaf', w('طماطم', 'بندوره')],
  ['sprout', w('افوكادو', 'افوكاتو')],
  ['shrimp', w('جمبري', 'روبيان', 'استاكوزا', 'كابوريا', 'جندوفلي')],
  ['wave', w('سمك', 'اسماك', 'بلطي', 'سردين', 'قاروص', 'سلمون', 'بوري', 'تونه', 'كاليماري', 'حبار')],
  ['cleaver', w('فراخ', 'دجاج', 'فرخه', 'ديك', 'صدور', 'وراك', 'ناجتس', 'بانيه', 'شاورما')],
  ['steak', w('ستيك', 'ريب', 'كبده', 'لحم', 'لحوم', 'كفته', 'مفروم', 'سجق', 'برجر', 'بسطرمه', 'سلامي', 'مرتديلا')],
  ['egg', w('بيض')],
  ['cheese', w('جبن', 'رومي', 'فيتا', 'قريش', 'موزاريلا', 'شيدر', 'حلوم')],
  ['yogurt', w('زبادي', 'روب', 'لبنه', 'قشطه', 'كريمه', 'كريم فريش')],
  ['butter', w('زبد', 'سمن', 'مارجرين')],
  ['drop', w('لبن', 'حليب', 'رايب')],
  ['croissant', w('كرواسون', 'كرواسان', 'فطير', 'مشلتت', 'دونات', 'كيك', 'بيتي فور')],
  ['toast', w('توست', 'بقسماط', 'ساندوتش', 'ساندويتش')],
  ['wheat', w('عيش', 'خبز', 'فينو', 'رغيف', 'صامولي', 'باجيت')],
  ['honey', w('عسل', 'مربي', 'مربى', 'طحينه', 'حلاوه', 'نوتيلا', 'دبس', 'مولاس')],
  ['nuts', w('لوز', 'فستق', 'كاجو', 'بندق', 'عين جمل', 'جوز', 'مكسرات', 'فول سوداني', 'سوداني', 'تمر', 'زبيب', 'شيا', 'بذور')],
  ['rice', w('ارز', 'عدس', 'فول', 'حمص', 'لوبيا', 'مكرون', 'دقيق', 'سكر', 'ملح', 'برغل', 'فريكه', 'شعير', 'اسباجتي', 'معكرونه', 'نشا', 'بهارات', 'توابل')],
  ['tea', w('شاي', 'ينسون', 'كركديه', 'قرفه', 'جنزبيل', 'بابونج', 'حلبه', 'اعشاب')],
  ['bean', w('قهوه', 'نسكافيه', 'اسبريسو', 'كابتشينو')],
  ['juice', w('عصير', 'عصاره', 'سموذي', 'نكتار', 'ريد بول', 'مشروب طاقه')],
  ['can', w('غازيه', 'بيبسي', 'كولا', 'سفن اب', 'سبرايت', 'شويبس', 'بيره', 'صودا')],
  ['bottle', w('مياه', 'ميه', 'مايه', 'ماء')],
  ['cone', w('ايس كريم', 'جيلاتي', 'بوظه')],
  ['cocoa', w('شوكولا', 'شيكولا', 'كاكاو', 'كيت كات')],
  ['cookie', w('بسكويت', 'كوكيز', 'شيبسي', 'شيبس', 'فشار', 'بسبوسه', 'كنافه', 'بقلاوه', 'حلويات', 'ويفر')],
  ['diaper', w('حفاض', 'حفاظ', 'رضاعه', 'سيريلاك', 'بيبي', 'اطفال')],
  ['shampoo', w('شامبو', 'صابون', 'معجون', 'مرطب', 'عطر', 'ديودورنت', 'مزيل', 'غسول', 'لوشن', 'بلسم', 'فرشاه')],
  ['spray', w('منظف', 'سائل', 'مسحوق', 'غسيل', 'كلور', 'ديتول', 'فيري', 'معطر', 'مبيد', 'ملمع')],
  ['bubble', w('مناديل', 'اكياس', 'اسفنج', 'اسفنجه', 'اطباق', 'اكواب')],
];

/**
 * مفتاح الستيكر الأنسب لاسم المنتج، أو null إن لم يطابق شيئًا.
 * نختار القاعدة التي تظهر **أولًا في الاسم** لا الأولى في القائمة: الاسم
 * العربي يبدأ بالمسمّى ثم يضيف وصفه («كنافة بالقشطة» كنافة، «عصير برتقال»
 * عصير). وعند التعادل تفوز الأسبق ترتيبًا في القائمة.
 */
export function resolveItemKey(name) {
  const text = normalize(name);
  if (!text) return null;
  let best = null;
  for (const [key, pattern] of RULES) {
    const match = pattern.exec(text);
    if (match && (best === null || match.index < best.index)) best = { key, index: match.index };
  }
  return best ? best.key : null;
}

/** مكوّن الستيكر لمنتج: خاصّ بالصنف إن أمكن، وإلا ستيكر قسمه */
export function getItemArt(name, motif) {
  const key = resolveItemKey(name);
  return ITEM_ART[key] || ART[key] || ART[motif] || ART.basket;
}
