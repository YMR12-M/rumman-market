import { branchesService } from './branches.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';

export const branchesController = {
  list: asyncHandler(async (req, res) => {
    const { lat, lng, city } = req.validatedQuery || req.query;
    ok(res, await branchesService.list({ lat, lng, city }));
  }),

  nearest: asyncHandler(async (req, res) => {
    const { lat, lng } = req.validatedQuery || req.query;
    ok(res, await branchesService.nearest(lat, lng));
  }),

  detail: asyncHandler(async (req, res) => {
    ok(res, await branchesService.findOne(req.params.identifier));
  }),
};
