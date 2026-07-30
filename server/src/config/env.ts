import { z } from 'zod'

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    FRONTEND_ORIGIN: z.url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    REQUEST_BODY_LIMIT: z.string().min(1).max(32).default('1mb'),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    ACCOUNT_SETUP_TOKEN_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(168)
      .default(24),
    AUTH_COOKIE_SECURE: booleanString.default(false),
    AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    MAIL_TRANSPORT: z.enum(['preview', 'smtp']).default('preview'),
    MAIL_FROM_NAME: z.string().min(1),
    MAIL_FROM_ADDRESS: z.email(),
    MAIL_PREVIEW_DIR: z.string().min(1).default('.mail-preview'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
  })
  .superRefine((value, context) => {
    if (value.AUTH_COOKIE_SAME_SITE === 'none' && !value.AUTH_COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE must be true when SameSite is none',
      })
    }

    if (value.NODE_ENV === 'production' && value.MAIL_TRANSPORT === 'preview') {
      context.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'Preview mail transport is disabled in production',
      })
    }

    if (value.MAIL_TRANSPORT === 'smtp') {
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'] as const) {
        if (!value[key]) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required for SMTP transport`,
          })
        }
      }
    }
  })

export interface AppEnv {
  nodeEnv: z.infer<typeof envSchema>['NODE_ENV']
  port: number
  databaseUrl: string
  frontendOrigin: string
  logLevel: z.infer<typeof envSchema>['LOG_LEVEL']
  requestBodyLimit: string
  accessTokenSecret: string
  accessTokenTtlMinutes: number
  refreshTokenTtlDays: number
  accountSetupTokenTtlHours: number
  authCookieSecure: boolean
  authCookieSameSite: z.infer<typeof envSchema>['AUTH_COOKIE_SAME_SITE']
  mailTransport: z.infer<typeof envSchema>['MAIL_TRANSPORT']
  mailFromName: string
  mailFromAddress: string
  mailPreviewDir: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
}

export class EnvironmentValidationError extends Error {
  readonly invalidKeys: string[]

  constructor(invalidKeys: string[]) {
    super(`Invalid environment configuration: ${invalidKeys.join(', ')}`)
    this.name = 'EnvironmentValidationError'
    this.invalidKeys = invalidKeys
  }
}

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(input)

  if (!result.success) {
    const invalidKeys = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))]
    throw new EnvironmentValidationError(invalidKeys)
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    frontendOrigin: result.data.FRONTEND_ORIGIN,
    logLevel: result.data.LOG_LEVEL,
    requestBodyLimit: result.data.REQUEST_BODY_LIMIT,
    accessTokenSecret: result.data.ACCESS_TOKEN_SECRET,
    accessTokenTtlMinutes: result.data.ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenTtlDays: result.data.REFRESH_TOKEN_TTL_DAYS,
    accountSetupTokenTtlHours: result.data.ACCOUNT_SETUP_TOKEN_TTL_HOURS,
    authCookieSecure: result.data.AUTH_COOKIE_SECURE,
    authCookieSameSite: result.data.AUTH_COOKIE_SAME_SITE,
    mailTransport: result.data.MAIL_TRANSPORT,
    mailFromName: result.data.MAIL_FROM_NAME,
    mailFromAddress: result.data.MAIL_FROM_ADDRESS,
    mailPreviewDir: result.data.MAIL_PREVIEW_DIR,
    smtpHost: result.data.SMTP_HOST,
    smtpPort: result.data.SMTP_PORT,
    smtpSecure: result.data.SMTP_SECURE,
    smtpUser: result.data.SMTP_USER,
    smtpPassword: result.data.SMTP_PASSWORD,
  }
}
