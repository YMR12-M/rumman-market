import { z } from 'zod';

export const createOrderSchema = z.object({
  branch_id: z.coerce.number().int().positive(),
  fulfillment_type: z.enum(['delivery', 'pickup']).default('delivery'),
  address_id: z.coerce.number().int().positive().optional(),
  // الوسائل المتاحة فعليًا تُفحَص مرّة أخرى في paymentsService.assertMethodEnabled
  payment_method: z.enum(['cod', 'instapay', 'fawry', 'wallet']).default('cod'),
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح').optional(),
  slot_from: z.string().regex(/^\d{2}:\d{2}$/, 'وقت غير صالح').optional(),
  slot_to: z.string().regex(/^\d{2}:\d{2}$/, 'وقت غير صالح').optional(),
  customer_note: z.string().trim().max(255).optional(),
  use_points: z.coerce.number().int().min(0).default(0),
}).refine(
  (data) => data.fulfillment_type !== 'delivery' || Boolean(data.address_id),
  { message: 'اختر عنوان التوصيل', path: ['address_id'] },
);

export const listOrdersQuery = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const slotsQuery = z.object({
  branch_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']),
  note: z.string().trim().max(255).optional(),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export const rateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});
