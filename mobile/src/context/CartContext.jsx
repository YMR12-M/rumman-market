/**
 * ═══════════════════════════════════════════════════════════════
 *  سياق السلة
 *
 *  وضعان:
 *   • زائر  → السلة في localStorage مع لقطة بيانات كل منتج،
 *             والإجماليات تُحسب محليًا بنفس قواعد الخادم.
 *   • مسجّل → السلة في قاعدة البيانات (تتبعه بين الأجهزة).
 *
 *  عند تسجيل الدخول تُدمج سلة الزائر في سلة الحساب تلقائيًا ثم تُفرغ
 *  النسخة المحلية — فلا يفقد العميل ما اختاره قبل الدخول.
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cartService } from '@/services/index.js';
import { storage, KEYS } from '@/lib/storage.js';
import { useAuth } from './AuthContext.jsx';
import { useBranch } from './BranchContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);

const EMPTY_CART = {
  items: [],
  items_count: 0,
  coupon: null,
  totals: {
    subtotal: 0, discount_total: 0, points_value: 0, delivery_fee: 0,
    tax_total: 0, grand_total: 0, free_delivery_applied: false,
    amount_to_free_delivery: 0, meets_minimum: false, minimum_required: 0,
  },
  has_issues: false,
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** حساب إجماليات سلة الزائر بنفس منطق الخادم */
function computeGuestTotals(items, branch) {
  const subtotal = round2(items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0));
  const freeOver = Number(branch?.free_delivery_over ?? 750);
  const baseFee = Number(branch?.delivery_fee ?? 30);
  const minimum = Number(branch?.min_order_amount ?? 100);
  const deliveryFee = subtotal >= freeOver ? 0 : baseFee;

  return {
    subtotal,
    discount_total: 0,
    points_value: 0,
    delivery_fee: subtotal > 0 ? deliveryFee : 0,
    tax_total: 0,
    grand_total: round2(subtotal + (subtotal > 0 ? deliveryFee : 0)),
    free_delivery_applied: subtotal > 0 && deliveryFee === 0,
    amount_to_free_delivery: subtotal >= freeOver ? 0 : round2(freeOver - subtotal),
    meets_minimum: subtotal >= minimum,
    minimum_required: minimum,
  };
}

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { branchId, branch } = useBranch();
  const toast = useToast();

  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mergedRef = useRef(false);

  /** بناء كائن السلة من التخزين المحلي (وضع الزائر) */
  const buildGuestCart = useCallback(() => {
    const items = storage.get(KEYS.guestCart, []);
    return {
      ...EMPTY_CART,
      items: items.map((item) => ({ ...item, line_total: round2(item.unit_price * item.quantity), issues: [] })),
      items_count: items.reduce((acc, item) => acc + item.quantity, 0),
      totals: computeGuestTotals(items, branch),
    };
  }, [branch]);

  const refresh = useCallback(async () => {
    if (!branchId) return;

    if (!isAuthenticated) {
      setCart(buildGuestCart());
      return;
    }

    setLoading(true);
    try {
      setCart(await cartService.get(branchId));
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, [branchId, isAuthenticated, buildGuestCart]);

  useEffect(() => { refresh(); }, [refresh]);

  // دمج سلة الزائر بعد أول تسجيل دخول في هذه الجلسة
  useEffect(() => {
    if (!isAuthenticated || !branchId || mergedRef.current) return;

    const guestItems = storage.get(KEYS.guestCart, []);
    mergedRef.current = true;
    if (guestItems.length === 0) return;

    cartService
      .merge(branchId, guestItems.map((item) => ({ product_id: item.product_id, quantity: item.quantity })))
      .then((merged) => {
        setCart(merged);
        storage.remove(KEYS.guestCart);
        toast.success('نقلنا سلتك السابقة إلى حسابك');
      })
      .catch(() => {});
  }, [isAuthenticated, branchId, toast]);

  /** إضافة منتج — نمرّر كائن المنتج كاملًا ليعمل وضع الزائر */
  const addItem = useCallback(async (product, quantity = 1) => {
    if (!isAuthenticated) {
      const items = storage.get(KEYS.guestCart, []);
      const existing = items.find((item) => item.product_id === product.id);

      if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.max_per_order ?? 20);
      else {
        items.push({
          product_id: product.id,
          slug: product.slug,
          name_ar: product.name_ar,
          unit_size: product.unit_size,
          unit: product.unit,
          unit_price: Number(product.effective_price ?? product.price),
          quantity,
          max_per_order: product.max_per_order ?? 20,
          category_motif: product.category_motif,
          category_accent: product.category_accent,
          category_name: product.category_name,
        });
      }

      storage.set(KEYS.guestCart, items);
      setCart(buildGuestCart());
      toast.success(`أُضيف «${product.name_ar}» إلى سلتك`);
      return;
    }

    try {
      const updated = await cartService.addItem({ branch_id: branchId, product_id: product.id, quantity });
      setCart(updated);
      toast.success(`أُضيف «${product.name_ar}» إلى سلتك`);
    } catch (error) {
      toast.error(error.message);
    }
  }, [isAuthenticated, branchId, buildGuestCart, toast]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (!isAuthenticated) {
      let items = storage.get(KEYS.guestCart, []);
      items = quantity <= 0
        ? items.filter((item) => item.product_id !== productId)
        : items.map((item) => (item.product_id === productId ? { ...item, quantity } : item));
      storage.set(KEYS.guestCart, items);
      setCart(buildGuestCart());
      return;
    }

    try {
      setCart(await cartService.updateItem(productId, { branch_id: branchId, quantity }));
    } catch (error) {
      toast.error(error.message);
    }
  }, [isAuthenticated, branchId, buildGuestCart, toast]);

  const removeItem = useCallback(async (productId) => {
    if (!isAuthenticated) {
      storage.set(KEYS.guestCart, storage.get(KEYS.guestCart, []).filter((item) => item.product_id !== productId));
      setCart(buildGuestCart());
      return;
    }
    try {
      setCart(await cartService.removeItem(productId, branchId));
    } catch (error) {
      toast.error(error.message);
    }
  }, [isAuthenticated, branchId, buildGuestCart, toast]);

  const clear = useCallback(async () => {
    if (!isAuthenticated) {
      storage.remove(KEYS.guestCart);
      setCart(buildGuestCart());
      return;
    }
    try {
      setCart(await cartService.clear(branchId));
    } catch (error) {
      toast.error(error.message);
    }
  }, [isAuthenticated, branchId, buildGuestCart, toast]);

  const applyCoupon = useCallback(async (code) => {
    try {
      setCart(await cartService.applyCoupon(branchId, code));
      toast.success('تم تطبيق كود الخصم');
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }, [branchId, toast]);

  const removeCoupon = useCallback(async () => {
    try { setCart(await cartService.removeCoupon(branchId)); } catch { /* تجاهل */ }
  }, [branchId]);

  /** كمية منتج بعينه داخل السلة — تستخدمها بطاقة المنتج */
  const quantityOf = useCallback(
    (productId) => cart.items.find((item) => item.product_id === productId)?.quantity ?? 0,
    [cart.items],
  );

  const value = useMemo(() => ({
    cart, loading, drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    addItem, updateQuantity, removeItem, clear,
    applyCoupon, removeCoupon, refresh, quantityOf,
  }), [cart, loading, drawerOpen, addItem, updateQuantity, removeItem, clear, applyCoupon, removeCoupon, refresh, quantityOf]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart يجب أن يُستخدم داخل CartProvider');
  return context;
};
