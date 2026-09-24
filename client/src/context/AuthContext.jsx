/**
 * سياق المصادقة.
 * يحفظ التوكنات محليًا، ويستعيد جلسة المستخدم عند تحديث الصفحة،
 * ويستمع لإشارة انتهاء الجلسة القادمة من طبقة الـ API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/index.js';
import { onSessionExpired } from '@/lib/api.js';
import { storage, KEYS } from '@/lib/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** تخزين التوكنات القادمة من الخادم */
  const persistTokens = (tokens) => {
    storage.set(KEYS.accessToken, tokens.access_token);
    storage.set(KEYS.refreshToken, tokens.refresh_token);
  };

  const clearSession = useCallback(() => {
    storage.remove(KEYS.accessToken);
    storage.remove(KEYS.refreshToken);
    setUser(null);
  }, []);

  // استعادة الجلسة عند فتح التطبيق
  useEffect(() => {
    const token = storage.get(KEYS.accessToken);
    if (!token) { setLoading(false); return; }

    authService.me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  // إذا أبلغت طبقة الـ API أن الجلسة انتهت، ننظّف الحالة هنا
  useEffect(() => onSessionExpired(() => clearSession()), [clearSession]);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    persistTokens(result.tokens);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authService.register(payload);
    persistTokens(result.tokens);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = storage.get(KEYS.refreshToken);
    await authService.logout(refreshToken).catch(() => {});
    clearSession();
  }, [clearSession]);

  /** تحديث بيانات المستخدم بعد تعديل الملف الشخصي أو إتمام طلب */
  const refreshUser = useCallback(async () => {
    if (!storage.get(KEYS.accessToken)) return null;
    const fresh = await authService.me().catch(() => null);
    if (fresh) setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isStaff: Boolean(user) && user.role !== 'customer',
    isAdmin: user?.role === 'admin',
    login, register, logout, refreshUser, setUser,
  }), [user, loading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth يجب أن يُستخدم داخل AuthProvider');
  return context;
};
