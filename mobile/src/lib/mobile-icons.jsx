/**
 * أيقونات لا يحتاجها إلا تطبيق الجوّال.
 *
 * مجموعة الهوية الأساسية في `icons.jsx` — نسخة حرفية من الواجهة
 * المكتبية لا تُعدَّل هنا. ما يلي مرسوم بنفس القواعد تمامًا (خطّ رفيع
 * 1.4، أطراف مستديرة، شبكة 24) كي لا يُعرف أيّ الملفّين جاءت منه
 * الأيقونة.
 */

const Svg = ({ size = 20, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

/** الرئيسية — بيت بسقف مائل */
export const IconHome = (p) => <Svg {...p}><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></Svg>;

/** نسخ إلى الحافظة */
export const IconCopy = (p) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Svg>;

/** الترتيب — أسهم متعاكسة */
export const IconSort = (p) => <Svg {...p}><path d="M8 4v16M8 4 5 7M8 4l3 3" /><path d="M16 20V4M16 20l-3-3M16 20l3-3" /></Svg>;

/** تحديد الموقع — تقاطع بدائرة */
export const IconLocate = (p) => <Svg {...p}><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></Svg>;

/** المساعدة — علامة استفهام في دائرة */
export const IconHelp = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6" /><path d="M12 17h.01" /></Svg>;

/** فريق الفرع — لوح بمشبك */
export const IconClipboard = (p) => <Svg {...p}><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3.8h6V5" /><path d="M9 11h6M9 15h4" /></Svg>;

/** الطابور — ثلاث بطاقات متراكبة */
export const IconQueue = (p) => <Svg {...p}><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M6 6h12M8 3h8" /></Svg>;

/** كاميرا — لالتقاط الإيصال */
export const IconCamera = (p) => <Svg {...p}><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4V8Z" /><circle cx="12" cy="13.5" r="3.4" /></Svg>;
