import { Router } from 'express';

import {
  authenticate,
  requireProjectRole
} from '../../core/middleware/auth.js';

import { systemsService } from './systems.service.js';

const systemsRouter = Router();
const categories = [
  'inventory',
  'coverage',
  'integrations',
  'data-quality',
  'security',
  'performance',
  'costs'
] as const;
type Category = (typeof categories)[number];

const ensureCategory = (value: string): Category => {
  if (categories.includes(value as Category)) {
    return value as Category;
  }
  throw new Error('Categoría inválida');
};

systemsRouter.use(authenticate);

const allowedRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];

systemsRouter.get(
  '/:category/:projectId',
  requireProjectRole(allowedRoles),
  async (req, res) => {
    const { category, projectId } = req.params as {
      category: string;
      projectId: string;
    };
    const key = ensureCategory(category);
    const items = await systemsService.list(projectId, key);
    res.json(items);
  }
);

systemsRouter.post(
  '/:category/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const { category, projectId } = req.params as {
      category: string;
      projectId: string;
    };
    const key = ensureCategory(category);
    const item = await systemsService.create(
      projectId,
      key,
      req.body,
      req.user!.id
    );
    res.status(201).json(item);
  }
);

systemsRouter.put(
  '/:category/:projectId/:itemId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const { category, itemId } = req.params as {
      category: string;
      itemId: string;
    };
    const key = ensureCategory(category);
    const item = await systemsService.update(
      itemId,
      key,
      req.body,
      req.user!.id
    );
    res.json(item);
  }
);

systemsRouter.delete(
  '/:category/:projectId/:itemId',
  requireProjectRole(['ConsultorLider']),
  async (req, res) => {
    const { category, itemId } = req.params as {
      category: string;
      itemId: string;
    };
    const key = ensureCategory(category);
    await systemsService.remove(itemId, key, req.user!.id);
    res.status(204).send();
  }
);

export { systemsRouter };
