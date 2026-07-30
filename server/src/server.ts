import 'dotenv/config'
import { createServer, type Server } from 'node:http'
import { createApp } from './app.js'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import {
  createPrismaClient,
  createPrismaDatabaseHealth,
} from './infrastructure/database/prisma.js'
import { createLogger } from './infrastructure/logging/logger.js'
import { createPreviewEmailClient } from './infrastructure/email/preview-email-client.js'
import { createSmtpEmailClient } from './infrastructure/email/smtp-email-client.js'
import { createAccountSetupRouter } from './modules/account-setup/account-setup.routes.js'
import { createPrismaAccountSetupRepository } from './modules/account-setup/account-setup.repository.js'
import { createAccountSetupService } from './modules/account-setup/account-setup.service.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import { createAuthService } from './modules/auth/auth.service.js'
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js'
import { createPasswordService } from './modules/auth/auth.password.js'
import { createTokenService } from './modules/auth/auth.tokens.js'
import {
  createAuthenticationMiddleware,
  createCsrfMiddleware,
} from './modules/auth/auth.middleware.js'
import { createUserProvisioningRouter } from './modules/users/user-provisioning.routes.js'
import { createPrismaUserProvisioningRepository } from './modules/users/user-provisioning.repository.js'
import { createUserProvisioningService } from './modules/users/user-provisioning.service.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger(env.logLevel)
  const prisma = createPrismaClient(env.databaseUrl)
  const passwordService = createPasswordService()
  const tokenService = createTokenService(
    env.accessTokenSecret,
    env.accessTokenTtlMinutes,
  )
  const authRepository = createPrismaAuthRepository(prisma)
  const authService = createAuthService({
    repository: authRepository,
    passwordService,
    tokenService,
    logger,
    config: { refreshTokenTtlDays: env.refreshTokenTtlDays },
  })
  const requireAuthentication = createAuthenticationMiddleware({
    repository: authRepository,
    tokenService,
  })
  const requireLogoutAuthentication = createAuthenticationMiddleware({
    repository: authRepository,
    tokenService,
    allowRevokedSession: true,
    allowInactiveUser: true,
  })
  const requireCsrf = createCsrfMiddleware(authService)
  const cookieConfig = {
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    accessMaxAgeMs: env.accessTokenTtlMinutes * 60 * 1000,
    refreshMaxAgeMs: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  }
  const emailClient =
    env.mailTransport === 'preview'
      ? createPreviewEmailClient(env.mailPreviewDir, logger)
      : createSmtpEmailClient({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          user: env.smtpUser,
          password: env.smtpPassword,
          fromName: env.mailFromName,
          fromAddress: env.mailFromAddress,
        })
  const accountSetupService = createAccountSetupService({
    repository: createPrismaAccountSetupRepository(prisma),
    passwordService,
    tokenService,
    logger,
  })
  const userProvisioningService = createUserProvisioningService({
    repository: createPrismaUserProvisioningRepository(prisma),
    tokenService,
    emailClient,
    logger,
    frontendOrigin: env.frontendOrigin,
    setupTokenTtlHours: env.accountSetupTokenTtlHours,
  })
  const app = createApp({
    config: {
      frontendOrigin: env.frontendOrigin,
      requestBodyLimit: env.requestBodyLimit,
    },
    databaseHealth: createPrismaDatabaseHealth(prisma),
    logger,
    featureRouters: {
      auth: createAuthRouter({
        authService,
        cookieConfig,
        requireAuthentication,
        requireLogoutAuthentication,
        requireCsrf,
      }),
      accountSetup: createAccountSetupRouter(accountSetupService),
      users: createUserProvisioningRouter({
        service: userProvisioningService,
        requireAuthentication,
        requireCsrf,
      }),
    },
  })
  const httpServer = createServer(app)
  let isShuttingDown = false

  const shutdown = async (reason: string, exitCode = 0): Promise<void> => {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    logger.info({ reason }, 'server shutdown started')

    const forceShutdown = setTimeout(() => {
      logger.fatal({ reason }, 'server shutdown timed out')
      process.exit(1)
    }, 10_000)
    forceShutdown.unref()

    await closeServer(httpServer)
    await prisma.$disconnect()
    clearTimeout(forceShutdown)
    logger.info({ reason }, 'server shutdown completed')
    process.exit(exitCode)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('uncaughtException', (error) => {
    logger.fatal({ errorType: error.name }, 'uncaught exception')
    void shutdown('uncaughtException', 1)
  })
  process.on('unhandledRejection', (reason) => {
    logger.fatal(
      { errorType: reason instanceof Error ? reason.name : typeof reason },
      'unhandled rejection',
    )
    void shutdown('unhandledRejection', 1)
  })

  httpServer.listen(env.port, () => {
    logger.info(
      {
        nodeEnv: env.nodeEnv,
        port: env.port,
      },
      'Projex API listening',
    )
  })
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

bootstrap().catch((error: unknown) => {
  if (error instanceof EnvironmentValidationError) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write('Server failed to start.\n')
  }

  process.exitCode = 1
})
