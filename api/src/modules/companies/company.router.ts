import { Router } from 'express';

import { authenticate, requireRole } from '../../core/middleware/auth';

import { companyService } from './company.service';

const companyRouter = Router();

companyRouter.use(authenticate, requireRole('admin'));

companyRouter.get('/', async (_req, res) => {
  const companies = await companyService.list();
  res.json(companies);
});

companyRouter.get('/:companyId', async (req, res) => {
  const company = await companyService.getById(req.params.companyId);
  res.json(company);
});

companyRouter.post('/', async (req, res) => {
  const company = await companyService.create(req.body, req.user!.id);
  res.status(201).json(company);
});

companyRouter.put('/:companyId', async (req, res) => {
  const company = await companyService.update(
    req.params.companyId,
    req.body,
    req.user!.id
  );
  res.json(company);
});

companyRouter.delete('/:companyId', async (req, res) => {
  await companyService.remove(req.params.companyId, req.user!.id);
  res.status(204).send();
});

export { companyRouter };
