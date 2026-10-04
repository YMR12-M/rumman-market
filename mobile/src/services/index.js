/**
 * نقطة تصدير واحدة لكل خدمات الواجهة.
 * كل الخدمات تتطلّب خادمًا فعليًا — لا بيانات محلّية ولا وضع عرض.
 * البيانات كلها تأتي من قاعدة البيانات الحقيقية.
 */
import { api } from '@/lib/api.js';

export { catalogService } from './catalog.service.js';
export { adminService, paymentService } from './admin.service.js';

export const authService = {
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  login: (payload) => api.post('/auth/login', payload, { auth: false }),
  logout: (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }, { auth: false }),
  me: () => api.get('/auth/me'),
  sessions: () => api.get('/auth/sessions'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload, { auth: false }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }, { auth: false }),
  resendVerification: () => api.post('/auth/resend-verification'),
};

export const userService = {
  profile: () => api.get('/users/profile'),
  updateProfile: (payload) => api.patch('/users/profile', payload),
  summary: () => api.get('/users/summary'),
  wallet: () => api.get('/users/wallet'),
};

export const addressService = {
  list: () => api.get('/addresses'),
  create: (payload) => api.post('/addresses', payload),
  update: (id, payload) => api.patch(`/addresses/${id}`, payload),
  remove: (id) => api.delete(`/addresses/${id}`),
};

export const cartService = {
  get: (branchId) => api.get('/cart', { branch_id: branchId }),
  addItem: (payload) => api.post('/cart/items', payload),
  updateItem: (productId, payload) => api.patch(`/cart/items/${productId}`, payload),
  removeItem: (productId, branchId) => api.delete(`/cart/items/${productId}`, { branch_id: branchId }),
  clear: (branchId) => api.delete('/cart', { branch_id: branchId }),
  applyCoupon: (branchId, code) => api.post('/cart/coupon', { branch_id: branchId, code }),
  removeCoupon: (branchId) => api.delete('/cart/coupon', { branch_id: branchId }),
  merge: (branchId, items) => api.post('/cart/merge', { branch_id: branchId, items }),
};

export const orderService = {
  create: (payload) => api.post('/orders', payload),
  list: (params) => api.paginated('/orders', params),
  detail: (orderNumber) => api.get(`/orders/${orderNumber}`),
  cancel: (orderNumber, reason) => api.post(`/orders/${orderNumber}/cancel`, { reason }),
  reorder: (orderNumber) => api.post(`/orders/${orderNumber}/reorder`),
  rate: (orderNumber, rating) => api.post(`/orders/${orderNumber}/rate`, { rating }),
  slots: (branchId, date) => api.get('/orders/slots', { branch_id: branchId, date }),
  updateStatus: (orderNumber, status, note) => api.patch(`/orders/${orderNumber}/status`, { status, note }),
};

export const wishlistService = {
  list: (branchId) => api.get('/wishlist', { branch_id: branchId }),
  ids: () => api.get('/wishlist/ids'),
  toggle: (productId) => api.post('/wishlist/toggle', { product_id: productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
};

export const reviewService = {
  forProduct: (productId, params) => api.get(`/reviews/product/${productId}`, params),
  create: (payload) => api.post('/reviews', payload),
  update: (id, payload) => api.patch(`/reviews/${id}`, payload),
  remove: (id) => api.delete(`/reviews/${id}`),
  helpful: (id) => api.post(`/reviews/${id}/helpful`),
  pending: () => api.get('/reviews/pending'),
};

export const notificationService = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const loyaltyService = {
  overview: () => api.get('/loyalty'),
  tiers: () => api.get('/loyalty/tiers'),
};

export const contentService = {
  contact: (payload) => api.post('/content/contact', payload, { auth: false }),
  newsletter: (email) => api.post('/content/newsletter', { email }, { auth: false }),
};

export const analyticsService = {
  overview: (params) => api.get('/analytics/overview', params),
  branches: () => api.get('/analytics/branches'),
  queue: (branchId) => api.get('/analytics/queue', { branch_id: branchId }),
};
