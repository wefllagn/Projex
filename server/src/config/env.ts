import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_ORIGIN: z.url(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REQUEST_BODY_LIMIT: z.string().min(1).max(32).default('1mb'),
})

export interface AppEnv {
  nodeEnv: z.infer<typeof envSchema>['NODE_ENV']
  port: number
  databaseUrl: string
  frontendOrigin: string
  logLevel: z.infer<typeof envSchema>['LOG_LEVEL']
  requestBodyLimit: string
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
  }
}
