import { Router } from 'express';
import type { Express, Request, Response } from 'express';

const surveysRouter = Router();

type ExpressRouter = {
  handle: (req: Request, res: Response, next: () => void) => void;
};

type ExpressAppWithRouter = Express & {
  _router?: ExpressRouter;
};

const forwardToForms = (req: Request, res: Response, url: string) => {
  const appWithRouter = req.app as ExpressAppWithRouter;
  const router = appWithRouter._router;

  if (!router) {
    res.status(500).json({ message: 'Router not initialized' });
    return;
  }

  const forwardedRequest = Object.assign(
    Object.create(Object.getPrototypeOf(req)),
    req,
    {
      baseUrl: '',
      url,
      originalUrl: url
    }
  ) as Request;

  router.handle.call(router, forwardedRequest, res, () => {});
};

/**
 * Alias GET:
 *   /api/surveys/:token  →  /api/forms/links/:token
 */
surveysRouter.get('/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  forwardToForms(req, res, `/api/forms/links/${encodeURIComponent(token)}`);
});

/**
 * Alias POST:
 *   /api/surveys/:token  →  /api/forms/submit/:token
 */
surveysRouter.post('/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  forwardToForms(req, res, `/api/forms/submit/${encodeURIComponent(token)}`);
});

export default surveysRouter;
