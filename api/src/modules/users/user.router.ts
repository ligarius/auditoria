import { Router } from 'express';

import { authenticate, requireRole } from '../../core/middleware/auth.js';

import { userService } from './user.service.js';

const userRouter = Router();

userRouter.use(authenticate, requireRole('admin'));

userRouter.get('/', async (_req, res) => {
  const users = await userService.list();
  res.json(users);
});

userRouter.post('/', async (req, res) => {
  const user = await userService.create(req.body, req.user!.id);
  res.status(201).json(user);
});

userRouter.put('/:userId', async (req, res) => {
  const user = await userService.update(
    req.params.userId,
    req.body,
    req.user!.id
  );
  res.json(user);
});

userRouter.delete('/:userId', async (req, res) => {
  await userService.remove(req.params.userId, req.user!.id);
  res.status(204).send();
});

export { userRouter };
