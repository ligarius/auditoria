import pino from 'pino';

const redactValue = (value: unknown) => {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower.startsWith('bearer ')) {
      return 'Bearer <redacted>';
    }
  }
  return '<redacted>';
};

export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'request.headers.authorization',
      'request.headers.cookie',
      'response.headers["set-cookie"]',
      'err.config.headers.authorization',
      'err.request.headers.authorization',
      'err.response.config.headers.authorization',
      'err.response.headers["set-cookie"]'
    ],
    censor: redactValue
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
});
