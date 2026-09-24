/**
 * خدمات الكتالوج (قراءة فقط).
 *
 * كل البيانات هنا تأتي من قاعدة البيانات عبر الـ API — لا نسخة محلّية
 * ولا بيانات مكتوبة في الكود. إن انقطع الخادم تظهر رسالة خطأ صريحة
 * للمستخدم بدل عرض كتالوج قديم لا يعكس المخزون أو الأسعار الحقيقية.
 */
import { api } from '@/lib/api.js';

export const catalogService = {
  branches: (params) => api.get('/branches', params),

  branch: (identifier) => api.get(`/branches/${identifier}`),

  nearestBranch: (lat, lng) => api.get('/branches/nearest', { lat, lng }),

  categories: (branchId) => api.get('/categories', { branch_id: branchId }),

  category: (slug, branchId) => api.get(`/categories/${slug}`, { branch_id: branchId }),

  products: (params) => api.paginated('/products', params),

  product: (slug, branchId) => api.get(`/products/${slug}`, { branch_id: branchId }),

  suggest: (term, branchId) => api.get('/products/suggest', { q: term, branch_id: branchId }),

  promotions: () => api.get('/content/promotions'),

  coupons: () => api.get('/coupons'),

  loyaltyTiers: () => api.get('/loyalty/tiers'),
};
