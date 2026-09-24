/**
 * ═══════════════════════════════════════════════════════════════
 *  خدمات لوحة الإدارة
 *
 *  مرآة مباشرة لمسارات /admin و/payments في الخادم. مجموعة في كائن
 *  واحد لكل كيان، فتقرأ شاشة اللوحة `adminService.branches.create(…)`
 *  بلا حاجة لتذكّر شكل المسار.
 * ═══════════════════════════════════════════════════════════════
 */
import { api } from '@/lib/api.js';

/** يبني الدوال الخمس المشتركة لكل كيان */
const crud = (path) => ({
  list:    (params) => api.get(path, params),
  page:    (params) => api.paginated(path, params),
  get:     (id) => api.get(`${path}/${id}`),
  create:  (payload) => api.post(path, payload),
  update:  (id, payload) => api.patch(`${path}/${id}`, payload),
  remove:  (id) => api.delete(`${path}/${id}`),
  restore: (id) => api.post(`${path}/${id}/restore`),
});

export const adminService = {
  /** قائمة تحقّق الجاهزية — أول شاشة بعد الدخول */
  readiness: () => api.get('/admin/readiness'),
  /** حالة الخدمات الخارجية: بريد، دفع، رفع */
  health: () => api.get('/admin/health'),

  branches: {
    ...crud('/admin/branches'),
    hours:        (id) => api.get(`/admin/branches/${id}/hours`),
    replaceHours: (id, hours) => api.put(`/admin/branches/${id}/hours`, { hours }),
    zones:        (id) => api.get(`/admin/branches/${id}/zones`),
    addZone:      (id, payload) => api.post(`/admin/branches/${id}/zones`, payload),
    updateZone:   (zoneId, payload) => api.patch(`/admin/delivery-zones/${zoneId}`, payload),
    removeZone:   (zoneId) => api.delete(`/admin/delivery-zones/${zoneId}`),
  },

  categories: {
    ...crud('/admin/categories'),
    reorder: (order) => api.post('/admin/categories/reorder', { order }),
    motifs:  () => api.get('/admin/categories/meta/motifs'),
  },

  brands: crud('/admin/brands'),

  products: {
    ...crud('/admin/products'),
    uploadImage:  (id, file, fields) => api.upload(`/admin/products/${id}/images`, file, fields, 'image'),
    removeImage:  (id, imageId) => api.delete(`/admin/products/${id}/images/${imageId}`),
    primaryImage: (id, imageId) => api.post(`/admin/products/${id}/images/${imageId}/primary`),
  },

  inventory: {
    list:      (params) => api.paginated('/admin/inventory', params),
    set:       (payload) => api.put('/admin/inventory', payload),
    adjust:    (payload) => api.post('/admin/inventory/adjust', payload),
    bulk:      (payload) => api.post('/admin/inventory/bulk', payload),
    movements: (branchId, productId) => api.get('/admin/inventory/movements', { branch_id: branchId, product_id: productId }),
  },

  import: {
    columns:  () => api.get('/admin/import/columns'),
    template: () => api.download('/admin/import/template', 'rumman-products-template.csv'),
    preview:  (csv, branchId) => api.post('/admin/import/products', { csv, commit: false, branch_id: branchId }),
    commit:   (csv, branchId) => api.post('/admin/import/products', { csv, commit: true, branch_id: branchId }),
  },

  orders: {
    list: (params) => api.paginated('/admin/orders', params),
  },

  coupons:    crud('/admin/coupons'),
  promotions: { ...crud('/admin/promotions'), reorder: (order) => api.post('/admin/promotions/reorder', { order }) },

  users: {
    list:        (params) => api.paginated('/admin/users', params),
    createStaff: (payload) => api.post('/admin/users/staff', payload),
    update:      (id, payload) => api.patch(`/admin/users/${id}`, payload),
  },

  settings: {
    all:  () => api.get('/admin/settings'),
    save: (settings) => api.put('/admin/settings', { settings }),
  },

  audit: (params) => api.get('/admin/audit', params),
};

/** وسائل الدفع ومراجعة التحويلات */
export const paymentService = {
  methods: () => api.get('/payments/methods'),

  /** العميل يرفع إيصال تحويل إنستاباي */
  submitProof: (orderNumber, file, fields) =>
    api.upload(`/payments/instapay/${orderNumber}/proof`, file, fields, 'proof'),

  /** الفريق يراجع */
  reviewQueue:   (branchId) => api.get('/payments/review-queue', { branch_id: branchId }),
  reviewProof:   (orderNumber, approved, note) => api.post(`/payments/instapay/${orderNumber}/review`, { approved, note }),
  refreshFawry:  (orderNumber) => api.post(`/payments/fawry/${orderNumber}/refresh`),
  collectCash:   (orderNumber) => api.post(`/payments/cod/${orderNumber}/collect`),
};
