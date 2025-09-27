import { Router } from 'express';

import { authService } from './auth.service.js';

const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const tokens = await authService.login(email, password);
  res.json(tokens);
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refresh(refreshToken);
  res.json(tokens);
});

export { authRouter };
