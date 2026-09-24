/**
 * مجموعة الأيقونات — كلّها بخط رفيع 1.4 ومن نفس العائلة البصرية.
 * لا نستخدم مكتبة أيقونات خارجية ولا إيموجي: الاتساق جزء من الهوية.
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

export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const IconCart = (p) => <Svg {...p}><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 8H6" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></Svg>;
export const IconUser = (p) => <Svg {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.5 3.1-5.6 7-5.6s7 2.1 7 5.6" /></Svg>;
export const IconHeart = ({ filled, ...p }) => (
  <Svg {...p}><path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const IconPin = (p) => <Svg {...p}><path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" /></Svg>;
export const IconBell = (p) => <Svg {...p}><path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 3h15L18 15Z" /><path d="M10 21h4" /></Svg>;
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconMinus = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const IconClose = (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconChevronLeft = (p) => <Svg {...p}><path d="m14 6-6 6 6 6" /></Svg>;
export const IconChevronRight = (p) => <Svg {...p}><path d="m10 6 6 6-6 6" /></Svg>;
export const IconChevronDown = (p) => <Svg {...p}><path d="m6 10 6 6 6-6" /></Svg>;
export const IconCheck = (p) => <Svg {...p}><path d="m5 13 4.5 4.5L19 7" /></Svg>;
export const IconStar = ({ filled, ...p }) => (
  <Svg {...p} strokeWidth="1.2"><path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const IconTruck = (p) => <Svg {...p}><path d="M2 7h11v10H2zM13 10h4l3 3v4h-7z" /><circle cx="6.5" cy="18" r="1.6" /><circle cx="16.5" cy="18" r="1.6" /></Svg>;
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Svg>;
export const IconShield = (p) => <Svg {...p}><path d="M12 3 5 6v5.5c0 4.3 2.9 7.7 7 9.5 4.1-1.8 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Svg>;
export const IconLeaf = (p) => <Svg {...p}><path d="M5 19c0-7 5-12 14-13 0 9-4 14-11 14a5 5 0 0 1-3-1Z" /><path d="M8 16c2.5-3 5-5 8-6.5" /></Svg>;
export const IconMenu = (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconFilter = (p) => <Svg {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>;
export const IconTrash = (p) => <Svg {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></Svg>;
export const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></Svg>;
export const IconMoon = (p) => <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></Svg>;
export const IconPackage = (p) => <Svg {...p}><path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" /><path d="m3 8.5 9 4.5 9-4.5M12 13v7" /></Svg>;
export const IconGift = (p) => <Svg {...p}><path d="M3 11h18v9H3zM3 7h18v4H3zM12 7v13" /><path d="M12 7S10.5 3.5 8.5 4.2 8.8 7.2 12 7ZM12 7s1.5-3.5 3.5-2.8S15.2 7.2 12 7Z" /></Svg>;
export const IconWallet = (p) => <Svg {...p}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3" /><path d="M3 7.5V18a2 2 0 0 0 2 2h14V8H5a2 2 0 0 1-2-2Z" /><circle cx="16" cy="14" r="1.1" /></Svg>;
export const IconPhone = (p) => <Svg {...p}><path d="M6 3h3l1.6 4-2 1.4a12 12 0 0 0 5 5l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.2 2 2 0 0 1 6 3Z" /></Svg>;
export const IconMail = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m3.5 6.5 8.5 6 8.5-6" /></Svg>;
export const IconChart = (p) => <Svg {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16V11M12 16V7M16 16v-3" /></Svg>;
export const IconSettings = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6 17 7M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6" /></Svg>;
export const IconLogout = (p) => <Svg {...p}><path d="M14 5H6v14h8" /><path d="m17 15 3-3-3-3M20 12h-9" /></Svg>;
export const IconRefresh = (p) => <Svg {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" /><path d="M4 20v-4h4" /></Svg>;
export const IconStore = (p) => <Svg {...p}><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9h16v11H4z" /><path d="M9 20v-6h6v6" /></Svg>;
export const IconInfo = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const IconTag = (p) => <Svg {...p}><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>;
export const IconWheat = (p) => (
  <Svg {...p}><path d="M12 21V8" /><path d="M12 12c-3 0-4.5-1.6-4.5-3.6S9 5 12 5s4.5 1.4 4.5 3.4S15 12 12 12Z" /><path d="M12 17c-3 0-4.5-1.6-4.5-3.6M12 17c3 0 4.5-1.6 4.5-3.6" /></Svg>
);

/* ── أيقونات لوحة الإدارة ───────────────────────────────────────── */
export const IconEdit = (p) => <Svg {...p}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M15 6.5 17.5 9" /></Svg>;
export const IconUpload = (p) => <Svg {...p}><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></Svg>;
export const IconDownload = (p) => <Svg {...p}><path d="M12 4v12" /><path d="m7.5 11.5 4.5 4.5 4.5-4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></Svg>;
export const IconImage = (p) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></Svg>;
export const IconGrid = (p) => <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></Svg>;
export const IconUsers = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6" /><path d="M17.5 14.6c2.2.6 3.5 2.3 3.5 4.4" /></Svg>;
export const IconBox = (p) => <Svg {...p}><path d="M12 3 3.5 7.3v9.4L12 21l8.5-4.3V7.3L12 3Z" /><path d="M3.5 7.3 12 11.6l8.5-4.3M12 11.6V21" /></Svg>;
export const IconList = (p) => <Svg {...p}><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></Svg>;
export const IconEye = (p) => <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></Svg>;
export const IconAlert = (p) => <Svg {...p}><path d="M12 4 2.8 20h18.4L12 4Z" /><path d="M12 10v4.5M12 17.5h.01" /></Svg>;
export const IconCreditCard = (p) => <Svg {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 14.5h3" /></Svg>;
export const IconCoins = (p) => <Svg {...p}><ellipse cx="12" cy="7" rx="7.5" ry="3.2" /><path d="M4.5 7v5c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V7" /><path d="M4.5 12v5c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-5" /></Svg>;
export const IconExternal = (p) => <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Svg>;
export const IconGrip = (p) => <Svg {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" /><circle cx="15" cy="6" r="1.3" fill="currentColor" /><circle cx="9" cy="12" r="1.3" fill="currentColor" /><circle cx="15" cy="12" r="1.3" fill="currentColor" /><circle cx="9" cy="18" r="1.3" fill="currentColor" /><circle cx="15" cy="18" r="1.3" fill="currentColor" /></Svg>;
export const IconArrowUp = (p) => <Svg {...p}><path d="M12 20V5" /><path d="m6 11 6-6 6 6" /></Svg>;
export const IconArrowDown = (p) => <Svg {...p}><path d="M12 4v15" /><path d="m6 13 6 6 6-6" /></Svg>;
export const IconFile = (p) => <Svg {...p}><path d="M13 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5L13 3.5Z" /><path d="M13 3.5v6h6" /></Svg>;
