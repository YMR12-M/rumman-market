import { Router } from 'express';
import { z } from 'zod';
import { categoriesService } from './categories.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const listQuery = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  featured: z.coerce.boolean().optional(),
});

router.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await categoriesService.list({ branchId: q.branch_id, featuredOnly: q.featured }));
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  ok(res, await categoriesService.findOne(req.params.slug, q.branch_id));
}));

export default router;
