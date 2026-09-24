import { Router } from 'express';
import { productsController } from './products.controller.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuthenticate, authenticate } from '../../middleware/authenticate.js';
import { listProductsQuery, suggestQuery } from './products.validation.js';

const router = Router();

// المسارات الثابتة تُسجَّل قبل :slug حتى لا يبتلعها المسار الديناميكي
router.get('/suggest',         validate({ query: suggestQuery }),      productsController.suggest);
router.get('/trending',                                               productsController.trending);
router.get('/recently-viewed', authenticate,                          productsController.recentlyViewed);

router.get('/',       optionalAuthenticate, validate({ query: listProductsQuery }), productsController.list);
router.get('/:slug',  optionalAuthenticate, validate({ query: listProductsQuery }), productsController.detail);

export default router;
