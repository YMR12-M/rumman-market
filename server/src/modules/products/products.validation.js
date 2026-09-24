import { z } from 'zod';

/** يحوّل "true"/"1" إلى boolean — الـ query string نصوص دائمًا */
const boolish = z.preprocess(
  (v) => (v === undefined ? undefined : ['true', '1', true, 1].includes(v)),
  z.boolean().optional(),
);

export const listProductsQuery = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(90).optional(),
  brand: z.string().trim().max(90).optional(),
  search: z.string().trim().max(160).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  organic: boolish,
  exclusive: boolish,
  featured: boolish,
  on_sale: boolish,
  in_stock: boolish,
  sort: z.enum(['featured', 'newest', 'price_asc', 'price_desc', 'rating', 'popular', 'name']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const suggestQuery = z.object({
  q: z.string().trim().min(1, 'أدخل كلمة للبحث').max(160),
  branch_id: z.coerce.number().int().positive().optional(),
});
