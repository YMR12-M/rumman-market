import { Router } from 'express';
import { z } from 'zod';
import { branchesController } from './branches.controller.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const geoQuery = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  city: z.string().trim().max(80).optional(),
});

const requiredGeoQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

router.get('/',                 validate({ query: geoQuery }),         branchesController.list);
router.get('/nearest',          validate({ query: requiredGeoQuery }), branchesController.nearest);
router.get('/:identifier',                                            branchesController.detail);

export default router;
