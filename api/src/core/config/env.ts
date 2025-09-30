import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().default('postgresql://localhost:5432/auditoria'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerido'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es requerido'),
    CLIENT_URL: z.string().url().optional(),
    CORS_ALLOWLIST: z.string().default('*'),
    FILE_STORAGE_PATH: z.string().default('./storage'),
    REDIS_HOST: z.string().default('redis'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_URL: z.string().url().optional(),
    BULL_PREFIX: z.string().default('auditoria'),
    SURVEY_REMINDER_DAYS: z.coerce.number().int().positive().default(3),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  })
  .transform((values) => {
    const parsedAllowlist = values.CORS_ALLOWLIST
      ? values.CORS_ALLOWLIST.split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0)
      : [];

    const clientUrl =
      values.CLIENT_URL ??
      (values.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined);

    const allowlist = new Set<string>();

    if (parsedAllowlist.length === 0 && !clientUrl) {
      allowlist.add('*');
    }

    parsedAllowlist.forEach((origin) => allowlist.add(origin));

    if (clientUrl) {
      allowlist.add(clientUrl);
    }

    const redisUrl =
      values.REDIS_URL ?? `redis://${values.REDIS_HOST}:${values.REDIS_PORT}`;

    return {
      ...values,
      CLIENT_URL: clientUrl,
      CORS_ALLOWLIST: Array.from(allowlist),
      REDIS_URL: redisUrl,
    };
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Error al validar variables de entorno', parsed.error.flatten().fieldErrors);
  throw new Error('Variables de entorno inválidas');
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  clientUrl: parsed.data.CLIENT_URL,
  corsAllowlist: parsed.data.CORS_ALLOWLIST,
  fileStoragePath: parsed.data.FILE_STORAGE_PATH,
  redisHost: parsed.data.REDIS_HOST,
  redisPort: parsed.data.REDIS_PORT,
  redisUrl: parsed.data.REDIS_URL,
  bullPrefix: parsed.data.BULL_PREFIX,
  surveyReminderDays: parsed.data.SURVEY_REMINDER_DAYS,
  rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
  loginRateLimitWindowMs: parsed.data.LOGIN_RATE_LIMIT_WINDOW_MS,
  loginRateLimitMax: parsed.data.LOGIN_RATE_LIMIT_MAX,
};

export type Env = typeof env;
