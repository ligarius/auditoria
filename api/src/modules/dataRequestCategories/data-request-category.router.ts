import { Router } from 'express';

import { authenticate, requireRole } from '../../core/middleware/auth';

import { dataRequestCategoryService } from './data-request-category.service';

const dataRequestCategoryRouter = Router();

dataRequestCategoryRouter.use(authenticate);

dataRequestCategoryRouter.get('/', async (_req, res) => {
  const categories = await dataRequestCategoryService.list();
  res.json(categories);
});

dataRequestCategoryRouter.post('/', requireRole('admin'), async (req, res) => {
  const category = await dataRequestCategoryService.create(
    req.body,
    req.user!.id
  );
  res.status(201).json(category);
});

dataRequestCategoryRouter.put(
  '/:categoryId',
  requireRole('admin'),
  async (req, res) => {
    const category = await dataRequestCategoryService.update(
      req.params.categoryId,
      req.body,
      req.user!.id
    );
    res.json(category);
  }
);

dataRequestCategoryRouter.delete(
  '/:categoryId',
  requireRole('admin'),
  async (req, res) => {
    await dataRequestCategoryService.remove(
      req.params.categoryId,
      req.user!.id
    );
    res.status(204).send();
  }
);

export { dataRequestCategoryRouter };
