/**
 * المفضّلة.
 * للزائر: تُحفظ محليًا. للمسجّل: في قاعدة البيانات.
 * نحتفظ بمجموعة المعرّفات فقط لأن الواجهة تحتاج معرفة «هل هذا مفضّل؟» بسرعة.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wishlistService } from '@/services/index.js';
import { storage } from '@/lib/storage.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const WishlistContext = createContext(null);
const GUEST_KEY = 'guest_wishlist';

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(() => new Set(storage.get(GUEST_KEY, [])));

  useEffect(() => {
    if (!isAuthenticated) {
      setIds(new Set(storage.get(GUEST_KEY, [])));
      return;
    }
    wishlistService.ids().then((list) => setIds(new Set(list))).catch(() => {});
  }, [isAuthenticated]);

  const toggle = useCallback(async (product) => {
    const productId = product.id;

    if (!isAuthenticated) {
      const next = new Set(ids);
      const wasIn = next.has(productId);
      if (wasIn) next.delete(productId); else next.add(productId);
      setIds(next);
      storage.set(GUEST_KEY, [...next]);
      toast.toast(wasIn ? 'أُزيل من المفضّلة' : 'أُضيف إلى المفضّلة');
      return;
    }

    try {
      const result = await wishlistService.toggle(productId);
      const next = new Set(ids);
      if (result.in_wishlist) next.add(productId); else next.delete(productId);
      setIds(next);
      toast.toast(result.in_wishlist ? 'أُضيف إلى المفضّلة' : 'أُزيل من المفضّلة');
    } catch (error) {
      toast.error(error.message);
    }
  }, [ids, isAuthenticated, toast]);

  const value = useMemo(() => ({
    ids,
    count: ids.size,
    has: (productId) => ids.has(productId),
    toggle,
  }), [ids, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist يجب أن يُستخدم داخل WishlistProvider');
  return context;
};
