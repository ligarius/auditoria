import { Router } from 'express';
import type { Request, Response } from 'express';

const surveysRouter = Router();

surveysRouter.get('/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  req.url = `/links/${encodeURIComponent(token)}`;
  return req.app._router.handle({ ...req, method: 'GET', url: req.url }, res, () => {});
});

surveysRouter.post('/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  req.url = `/submit/${encodeURIComponent(token)}`;
  return req.app._router.handle({ ...req, method: 'POST', url: req.url }, res, () => {});
});

export default surveysRouter;
