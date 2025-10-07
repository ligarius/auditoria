import { type NextFunction, type Request, type Response } from 'express';

const API_PREFIX = '/api';

const setNoStoreHeaders = (res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
};

export function noCacheDevMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headers = req.headers as Record<string, unknown>;
  delete headers['if-none-match'];
  delete headers['if-modified-since'];

  if (req.originalUrl.startsWith(API_PREFIX)) {
    setNoStoreHeaders(res);

    const originalJson = res.json.bind(res);
    res.json = (...args: Parameters<typeof res.json>) => {
      setNoStoreHeaders(res);
      return originalJson(...args);
    };

    const originalSend = res.send.bind(res);
    res.send = (...args: Parameters<typeof res.send>) => {
      setNoStoreHeaders(res);
      return originalSend(...args);
    };
  }

  next();
}
