import { z } from 'zod'
import path from 'node:path'

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().trim().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    FRONTEND_ORIGIN: z.url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    REQUEST_BODY_LIMIT: z.string().min(1).max(32).default('1mb'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(1).default(0),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    SESSION_IDLE_TTL_MINUTES: z.coerce.number().int().min(15).max(43_200).default(30),
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
    JAVA_EXECUTION_MODE: z.enum(['disabled', 'local_process']).default('disabled'),
    JAVA_EXECUTABLE: z.string().min(1).default('java'),
    JAVAC_EXECUTABLE: z.string().min(1).default('javac'),
    JAVA_RELEASE: z.coerce.number().int().min(17).max(17).default(17),
    JAVA_JOB_ROOT: z.string().min(1).default('.java-jobs'),
    JAVA_SOURCE_LIMIT_BYTES: z.coerce.number().int().min(1).max(1_000_000).default(100_000),
    JAVA_COMPILE_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
    JAVA_TEST_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(3_000),
    JAVA_OUTPUT_LIMIT_BYTES: z.coerce.number().int().min(1_024).max(1_000_000).default(65_536),
    JAVA_MEMORY_LIMIT_MB: z.coerce.number().int().min(16).max(512).default(64),
    EXECUTION_JOB_LEASE_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000),
    EXECUTION_WORKER_POLL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
    PRACTICE_RUN_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    PRACTICE_RUNS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(5),
    PRACTICE_MAX_ACTIVE_PER_ACTIVITY: z.coerce.number().int().min(1).max(5).default(1),
    GIT_EXECUTION_MODE: z.enum(['disabled', 'local_process']).default('disabled'),
    GIT_EXECUTABLE: z.string().default(''),
    GIT_STORAGE_ROOT: z.string().default(''),
    GIT_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
    GIT_OUTPUT_LIMIT_BYTES: z.coerce.number().int().min(1_024).max(4_194_304).default(1_048_576),
    GIT_REPOSITORY_SIZE_LIMIT_BYTES: z.coerce.number().int().min(1_048_576).max(2_147_483_647).default(104_857_600),
    GIT_PROVISIONING_JOB_LEASE_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000),
    GIT_PROVISIONING_WORKER_POLL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
    GIT_PROVISIONING_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    GIT_SMART_HTTP_ENABLED: booleanString.default(false),
    GIT_HTTP_BACKEND_EXECUTABLE: z.string().default(''),
    GIT_CREDENTIAL_TTL_MINUTES: z.coerce.number().int().min(1).max(15).default(15),
    GIT_HTTP_REQUEST_LIMIT_BYTES: z.coerce.number().int().min(1_048_576).max(104_857_600).default(26_214_400),
    GIT_HTTP_RESPONSE_LIMIT_BYTES: z.coerce.number().int().min(1_048_576).max(536_870_912).default(115_343_360),
    GIT_HTTP_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000),
    GIT_HTTP_MAX_CONCURRENT: z.coerce.number().int().min(1).max(32).default(4),
    GIT_MAX_BRANCHES: z.coerce.number().int().min(1).max(1_000).default(100),
    GIT_MAX_REF_UPDATES: z.coerce.number().int().min(1).max(500).default(50),
    GIT_MAX_NEW_COMMITS: z.coerce.number().int().min(1).max(10_000).default(200),
    GIT_BLOB_LIMIT_BYTES: z.coerce.number().int().min(1_024).max(104_857_600).default(10_485_760),
    GIT_INSPECTION_FILE_LIMIT_BYTES: z.coerce.number().int().min(1_024).max(1_048_576).default(262_144),
    GIT_INSPECTION_DIFF_LIMIT_BYTES: z.coerce.number().int().min(4_096).max(4_194_304).default(524_288),
    GIT_INSPECTION_MAX_CHANGED_FILES: z.coerce.number().int().min(1).max(2_000).default(500),
  })
  .superRefine((value, context) => {
    if (value.AUTH_COOKIE_SAME_SITE === 'none' && !value.AUTH_COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE must be true when SameSite is none',
      })
    }

    if (value.NODE_ENV === 'production' && !value.AUTH_COOKIE_SECURE) {
      context.addIssue({ code: 'custom', path: ['AUTH_COOKIE_SECURE'], message: 'Secure authentication cookies are required in production' })
    }

    if (value.NODE_ENV === 'production' && value.TRUST_PROXY_HOPS !== 1) {
      context.addIssue({ code: 'custom', path: ['TRUST_PROXY_HOPS'], message: 'Hosted production requires exactly one trusted reverse-proxy hop' })
    }

    if (value.SESSION_IDLE_TTL_MINUTES > value.REFRESH_TOKEN_TTL_DAYS * 24 * 60) {
      context.addIssue({ code: 'custom', path: ['SESSION_IDLE_TTL_MINUTES'], message: 'Session idle expiry cannot exceed absolute refresh-session expiry' })
    }

    if (value.SESSION_IDLE_TTL_MINUTES <= value.ACCESS_TOKEN_TTL_MINUTES) {
      context.addIssue({ code: 'custom', path: ['SESSION_IDLE_TTL_MINUTES'], message: 'Session idle expiry must exceed the access-token lifetime' })
    }

    if (value.NODE_ENV === 'production' && value.MAIL_TRANSPORT === 'preview') {
      context.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'Preview mail transport is disabled in production',
      })
    }

    if (
      value.NODE_ENV === 'production' &&
      value.JAVA_EXECUTION_MODE === 'local_process'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JAVA_EXECUTION_MODE'],
        message: 'local_process Java execution is forbidden in production',
      })
    }

    if (value.NODE_ENV === 'production' && value.GIT_EXECUTION_MODE === 'local_process') {
      context.addIssue({
        code: 'custom',
        path: ['GIT_EXECUTION_MODE'],
        message: 'local_process Git execution is forbidden in production',
      })
    }

    if (value.GIT_EXECUTION_MODE === 'local_process') {
      for (const key of ['GIT_EXECUTABLE', 'GIT_STORAGE_ROOT'] as const) {
        if (!value[key] || !path.isAbsolute(value[key])) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must be an absolute path when Git execution is enabled`,
          })
        }
      }
    }

    if (value.GIT_SMART_HTTP_ENABLED) {
      if (value.GIT_EXECUTION_MODE !== 'local_process') {
        context.addIssue({
          code: 'custom',
          path: ['GIT_SMART_HTTP_ENABLED'],
          message: 'Git Smart HTTP requires local_process Git execution',
        })
      }
      if (!value.GIT_HTTP_BACKEND_EXECUTABLE || !path.isAbsolute(value.GIT_HTTP_BACKEND_EXECUTABLE)) {
        context.addIssue({
          code: 'custom',
          path: ['GIT_HTTP_BACKEND_EXECUTABLE'],
          message: 'GIT_HTTP_BACKEND_EXECUTABLE must be an absolute path',
        })
      }
      if (!['127.0.0.1', '::1', 'localhost'].includes(value.HOST.toLowerCase())) {
        context.addIssue({
          code: 'custom',
          path: ['HOST'],
          message: 'Phase 8B plaintext Git Smart HTTP must bind to loopback',
        })
      }
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
  host: string
  port: number
  databaseUrl: string
  frontendOrigin: string
  logLevel: z.infer<typeof envSchema>['LOG_LEVEL']
  requestBodyLimit: string
  trustProxyHops: number
  accessTokenSecret: string
  accessTokenTtlMinutes: number
  refreshTokenTtlDays: number
  sessionIdleTtlMinutes: number
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
  javaExecutionMode: z.infer<typeof envSchema>['JAVA_EXECUTION_MODE']
  javaExecutable: string
  javacExecutable: string
  javaRelease: number
  javaJobRoot: string
  javaSourceLimitBytes: number
  javaCompileTimeoutMs: number
  javaTestTimeoutMs: number
  javaOutputLimitBytes: number
  javaMemoryLimitMb: number
  executionJobLeaseMs: number
  executionWorkerPollMs: number
  practiceRunTtlHours: number
  practiceRunsPerMinute: number
  practiceMaxActivePerActivity: number
  gitExecutionMode: z.infer<typeof envSchema>['GIT_EXECUTION_MODE']
  gitExecutable: string
  gitStorageRoot: string
  gitCommandTimeoutMs: number
  gitOutputLimitBytes: number
  gitRepositorySizeLimitBytes: number
  gitProvisioningJobLeaseMs: number
  gitProvisioningWorkerPollMs: number
  gitProvisioningMaxAttempts: number
  gitSmartHttpEnabled: boolean
  gitHttpBackendExecutable: string
  gitCredentialTtlMinutes: number
  gitHttpRequestLimitBytes: number
  gitHttpResponseLimitBytes: number
  gitHttpTimeoutMs: number
  gitHttpMaxConcurrent: number
  gitMaxBranches: number
  gitMaxRefUpdates: number
  gitMaxNewCommits: number
  gitBlobLimitBytes: number
  gitInspectionFileLimitBytes: number
  gitInspectionDiffLimitBytes: number
  gitInspectionMaxChangedFiles: number
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
    host: result.data.HOST,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    frontendOrigin: result.data.FRONTEND_ORIGIN,
    logLevel: result.data.LOG_LEVEL,
    requestBodyLimit: result.data.REQUEST_BODY_LIMIT,
    trustProxyHops: result.data.TRUST_PROXY_HOPS,
    accessTokenSecret: result.data.ACCESS_TOKEN_SECRET,
    accessTokenTtlMinutes: result.data.ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenTtlDays: result.data.REFRESH_TOKEN_TTL_DAYS,
    sessionIdleTtlMinutes: result.data.SESSION_IDLE_TTL_MINUTES,
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
    javaExecutionMode: result.data.JAVA_EXECUTION_MODE,
    javaExecutable: result.data.JAVA_EXECUTABLE,
    javacExecutable: result.data.JAVAC_EXECUTABLE,
    javaRelease: result.data.JAVA_RELEASE,
    javaJobRoot: result.data.JAVA_JOB_ROOT,
    javaSourceLimitBytes: result.data.JAVA_SOURCE_LIMIT_BYTES,
    javaCompileTimeoutMs: result.data.JAVA_COMPILE_TIMEOUT_MS,
    javaTestTimeoutMs: result.data.JAVA_TEST_TIMEOUT_MS,
    javaOutputLimitBytes: result.data.JAVA_OUTPUT_LIMIT_BYTES,
    javaMemoryLimitMb: result.data.JAVA_MEMORY_LIMIT_MB,
    executionJobLeaseMs: result.data.EXECUTION_JOB_LEASE_MS,
    executionWorkerPollMs: result.data.EXECUTION_WORKER_POLL_MS,
    practiceRunTtlHours: result.data.PRACTICE_RUN_TTL_HOURS,
    practiceRunsPerMinute: result.data.PRACTICE_RUNS_PER_MINUTE,
    practiceMaxActivePerActivity: result.data.PRACTICE_MAX_ACTIVE_PER_ACTIVITY,
    gitExecutionMode: result.data.GIT_EXECUTION_MODE,
    gitExecutable: result.data.GIT_EXECUTABLE,
    gitStorageRoot: result.data.GIT_STORAGE_ROOT,
    gitCommandTimeoutMs: result.data.GIT_COMMAND_TIMEOUT_MS,
    gitOutputLimitBytes: result.data.GIT_OUTPUT_LIMIT_BYTES,
    gitRepositorySizeLimitBytes: result.data.GIT_REPOSITORY_SIZE_LIMIT_BYTES,
    gitProvisioningJobLeaseMs: result.data.GIT_PROVISIONING_JOB_LEASE_MS,
    gitProvisioningWorkerPollMs: result.data.GIT_PROVISIONING_WORKER_POLL_MS,
    gitProvisioningMaxAttempts: result.data.GIT_PROVISIONING_MAX_ATTEMPTS,
    gitSmartHttpEnabled: result.data.GIT_SMART_HTTP_ENABLED,
    gitHttpBackendExecutable: result.data.GIT_HTTP_BACKEND_EXECUTABLE,
    gitCredentialTtlMinutes: result.data.GIT_CREDENTIAL_TTL_MINUTES,
    gitHttpRequestLimitBytes: result.data.GIT_HTTP_REQUEST_LIMIT_BYTES,
    gitHttpResponseLimitBytes: result.data.GIT_HTTP_RESPONSE_LIMIT_BYTES,
    gitHttpTimeoutMs: result.data.GIT_HTTP_TIMEOUT_MS,
    gitHttpMaxConcurrent: result.data.GIT_HTTP_MAX_CONCURRENT,
    gitMaxBranches: result.data.GIT_MAX_BRANCHES,
    gitMaxRefUpdates: result.data.GIT_MAX_REF_UPDATES,
    gitMaxNewCommits: result.data.GIT_MAX_NEW_COMMITS,
    gitBlobLimitBytes: result.data.GIT_BLOB_LIMIT_BYTES,
    gitInspectionFileLimitBytes: result.data.GIT_INSPECTION_FILE_LIMIT_BYTES,
    gitInspectionDiffLimitBytes: result.data.GIT_INSPECTION_DIFF_LIMIT_BYTES,
    gitInspectionMaxChangedFiles: result.data.GIT_INSPECTION_MAX_CHANGED_FILES,
  }
}
