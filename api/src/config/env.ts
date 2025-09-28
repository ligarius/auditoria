import { z } from 'zod';

const DEFAULTS = {
  JWT_SECRET: 'dev-jwt-secret-change-me',
  JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-change-me',
  DATABASE_URL: 'postgresql://postgres:postgres@db:5432/auditoria?schema=public',
  CLIENT_URL: 'http://localhost:5173',
  FILE_STORAGE_PATH: '/usr/src/app/storage'
} as const;

const rawEnv: Record<string, string | undefined> = { ...process.env };

if (!rawEnv.NODE_ENV) {
  rawEnv.NODE_ENV = 'development';
}

if (rawEnv.NODE_ENV !== 'production') {
  rawEnv.JWT_SECRET = rawEnv.JWT_SECRET ?? DEFAULTS.JWT_SECRET;
  rawEnv.JWT_REFRESH_SECRET = rawEnv.JWT_REFRESH_SECRET ?? DEFAULTS.JWT_REFRESH_SECRET;
  rawEnv.DATABASE_URL = rawEnv.DATABASE_URL ?? DEFAULTS.DATABASE_URL;
  rawEnv.CLIENT_URL = rawEnv.CLIENT_URL ?? DEFAULTS.CLIENT_URL;
  rawEnv.FILE_STORAGE_PATH = rawEnv.FILE_STORAGE_PATH ?? DEFAULTS.FILE_STORAGE_PATH;
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
    CLIENT_URL: z.string().min(1, 'CLIENT_URL es requerido'),
    CORS_ALLOWLIST: z.string().optional(),
    FILE_STORAGE_PATH: z.string().min(1, 'FILE_STORAGE_PATH es requerido'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    SUPERSET_BASE_URL: z.string().optional(),
    SUPERSET_USERNAME: z.string().optional(),
    SUPERSET_PASSWORD: z.string().optional(),
    SUPERSET_GUEST_USERNAME: z.string().optional(),
    SUPERSET_SECRET_KEY: z.string().optional(),
    SUPERSET_ANALYTICS_DB_URI: z.string().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    METRICS_PREFIX: z.string().default('auditoria_')
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (value.JWT_SECRET === DEFAULTS.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET no puede usar el valor por defecto en producción'
        });
      }
      if (value.JWT_REFRESH_SECRET === DEFAULTS.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET no puede usar el valor por defecto en producción'
        });
      }
    }
  })
  .transform((value) => ({
    ...value,
    corsOrigins: (value.CORS_ALLOWLIST?.split(',') ?? [])
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  }));

const parsed = EnvSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('Error al validar variables de entorno', parsed.error.flatten().fieldErrors);
  throw new Error('Variables de entorno inválidas');
}

export const env = parsed.data;
