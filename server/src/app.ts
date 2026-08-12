import cors from 'cors'
import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import type { Router } from 'express'
import type { Logger } from 'pino'
import type { DatabaseHealth } from './infrastructure/database/prisma.js'
import { createRequestLogger } from './infrastructure/logging/logger.js'
import { createErrorHandler } from './middleware/error-handler.js'
import { notFoundMiddleware } from './middleware/not-found.js'
import { requestIdMiddleware } from './middleware/request-id.js'
import { createHealthRouter } from './modules/health/health.routes.js'
import { createHealthService } from './modules/health/health.service.js'
import { AppError } from './shared/errors/app-error.js'

export interface AppConfig {
  frontendOrigin: string
  requestBodyLimit: string
  trustProxyHops?: number
}

export interface AppDependencies {
  config: AppConfig
  databaseHealth: DatabaseHealth
  logger: Logger
  now?: () => Date
  featureRouters?: {
    auth: Router
    accountSetup: Router
    admin?: Router
    users: Router
    classes: Router
    activities: Router
    submissions: Router
    projectTasks?: Router
    repositories?: Router
    gitTransport?: Router
    repositoryContent?: Router
    capabilities?: Router
  }
}

export function createApp({
  config,
  databaseHealth,
  logger,
  now,
  featureRouters,
}: AppDependencies): Express {
  const app = express()
  const healthService = createHealthService({ databaseHealth, now })

  app.disable('x-powered-by')
  if ((config.trustProxyHops ?? 0) > 0) app.set('trust proxy', config.trustProxyHops)
  app.use(requestIdMiddleware)
  app.use(createRequestLogger(logger))
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === config.frontendOrigin) {
          callback(null, true)
          return
        }
        callback(
          new AppError({
            statusCode: 403,
            code: 'CORS_ORIGIN_DENIED',
            message: 'Origin is not allowed.',
          }),
        )
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: config.requestBodyLimit }))
  app.use(cookieParser())

  app.use('/api/v1/health', createHealthRouter(healthService))
  if (featureRouters?.capabilities) app.use('/api/v1/capabilities', featureRouters.capabilities)
  if (featureRouters) {
    app.use('/api/v1/auth', featureRouters.auth)
    app.use('/api/v1/account-setup', featureRouters.accountSetup)
    if (featureRouters.admin) {
      app.use('/api/v1/admin', featureRouters.admin)
    }
    app.use('/api/v1/users', featureRouters.users)
    app.use('/api/v1/classes', featureRouters.classes)
    app.use('/api/v1/activities', featureRouters.activities)
    app.use('/api/v1', featureRouters.submissions)
    if (featureRouters.projectTasks) {
      app.use('/api/v1/project-tasks', featureRouters.projectTasks)
    }
    if (featureRouters.repositories) {
      app.use('/api/v1', featureRouters.repositories)
    }
    if (featureRouters.gitTransport) {
      app.use('/api/v1', featureRouters.gitTransport)
    }
    if (featureRouters.repositoryContent) {
      app.use('/api/v1', featureRouters.repositoryContent)
    }
  }

  app.use(notFoundMiddleware)
  app.use(createErrorHandler(logger))

  return app
}
