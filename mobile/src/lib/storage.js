/**
 * غلاف آمن حول localStorage.
 * المتصفّح قد يرفض التخزين (وضع التصفّح الخاص، إعدادات صارمة) ويرمي
 * استثناءً يكسر الصفحة — لذلك نحيط كل عملية بـ try/catch.
 */
const PREFIX = 'rumman:';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* تجاهل */ }
  },
};

/** مفاتيح التخزين — مركزيّة لتفادي الأخطاء المطبعية */
export const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  branchId: 'branch_id',
  theme: 'theme',
  guestCart: 'guest_cart',
  recentSearches: 'recent_searches',
};
