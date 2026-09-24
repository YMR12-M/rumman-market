/**
 * خريطة الـ API كاملة في ملف واحد.
 * قراءة هذا الملف وحده تكفي لمعرفة كل ما يقدّمه السيرفر.
 */
import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import addressesRoutes from '../modules/addresses/addresses.routes.js';
import branchesRoutes from '../modules/branches/branches.routes.js';
import categoriesRoutes from '../modules/categories/categories.routes.js';
import productsRoutes from '../modules/products/products.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import ordersRoutes from '../modules/orders/orders.routes.js';
import couponsRoutes from '../modules/coupons/coupons.routes.js';
import reviewsRoutes from '../modules/reviews/reviews.routes.js';
import wishlistRoutes from '../modules/wishlist/wishlist.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import loyaltyRoutes from '../modules/loyalty/loyalty.routes.js';
import contentRoutes from '../modules/content/content.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = Router();

/** فهرس الـ API — مفيد للمطوّرين عند فتح الجذر */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'رُمّان | RUMMAN Market API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth', users: '/users', addresses: '/addresses',
      branches: '/branches', categories: '/categories', products: '/products',
      cart: '/cart', orders: '/orders', coupons: '/coupons',
      reviews: '/reviews', wishlist: '/wishlist',
      notifications: '/notifications', loyalty: '/loyalty',
      content: '/content', analytics: '/analytics',
      payments: '/payments', admin: '/admin',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/addresses', addressesRoutes);
router.use('/branches', branchesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/coupons', couponsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/content', contentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/admin', adminRoutes);

export default router;
