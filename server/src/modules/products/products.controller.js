import { productsService } from './products.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated } from '../../utils/response.js';
import { getPagination } from '../../utils/pagination.js';

/** تحويل معاملات الـ query إلى شكل الفلاتر الذي تفهمه الخدمة */
const toFilters = (q) => ({
  branchId: q.branch_id,
  category: q.category,
  brand: q.brand,
  search: q.search,
  minPrice: q.min_price,
  maxPrice: q.max_price,
  minRating: q.min_rating,
  organic: q.organic,
  exclusive: q.exclusive,
  featured: q.featured,
  onSale: q.on_sale,
  inStock: q.in_stock,
  sort: q.sort,
});

export const productsController = {
  list: asyncHandler(async (req, res) => {
    const q = req.validatedQuery || req.query;
    const pagination = getPagination(q);
    const { items, pagination: meta } = await productsService.list(toFilters(q), pagination);

    // نسجّل البحث فقط عند وجود نص فعلي، ولا ننتظر اكتمال التسجيل
    if (q.search) productsService.logSearch(q.search, meta.total, req.user?.id);

    paginated(res, items, meta);
  }),

  detail: asyncHandler(async (req, res) => {
    const q = req.validatedQuery || req.query;
    const branchId = q.branch_id ? Number(q.branch_id) : null;
    const product = await productsService.findBySlug(req.params.slug, branchId, req.user?.id);

    const [related, together] = await Promise.all([
      productsService.related(product.id, product.category_id, branchId),
      productsService.frequentlyBoughtTogether(product.id),
    ]);

    ok(res, { ...product, related, frequently_bought_together: together });
  }),

  suggest: asyncHandler(async (req, res) => {
    const q = req.validatedQuery || req.query;
    const [items, trending] = await Promise.all([
      productsService.suggest(q.q, q.branch_id),
      productsService.trendingSearches(),
    ]);
    ok(res, { items, trending });
  }),

  trending: asyncHandler(async (_req, res) => {
    ok(res, await productsService.trendingSearches());
  }),

  recentlyViewed: asyncHandler(async (req, res) => {
    const q = req.validatedQuery || req.query;
    ok(res, await productsService.recentlyViewed(req.user.id, q.branch_id));
  }),
};
