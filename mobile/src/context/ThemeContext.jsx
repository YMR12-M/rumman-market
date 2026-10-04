/**
 * الوضع الفاتح/الليلي.
 * القيمة تُحفظ محليًا، وإن لم يختر المستخدم شيئًا نتبع تفضيل نظامه.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage, KEYS } from '@/lib/storage.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = storage.get(KEYS.theme);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(KEYS.theme, theme);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme يجب أن يُستخدم داخل ThemeProvider');
  return context;
};
