import { Router } from 'express';

import { authService } from './auth.service.js';
import { authRateLimiter } from '../../middleware/ratelimit.js';

const authRouter = Router();

authRouter.post('/login', authRateLimiter, async (req, res) => {
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
