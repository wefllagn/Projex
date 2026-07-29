import cors from 'cors'
import express, { type Express } from 'express'
import type { Logger } from 'pino'
import type { DatabaseHealth } from './infrastructure/database/prisma.js'
import { createRequestLogger } from './infrastructure/logging/logger.js'
import { createErrorHandler } from './middleware/error-handler.js'
import { notFoundMiddleware } from './middleware/not-found.js'
import { requestIdMiddleware } from './middleware/request-id.js'
import { createHealthRouter } from './modules/health/health.routes.js'
import { createHealthService } from './modules/health/health.service.js'

export interface AppConfig {
  frontendOrigin: string
  requestBodyLimit: string
}

export interface AppDependencies {
  config: AppConfig
  databaseHealth: DatabaseHealth
  logger: Logger
  now?: () => Date
}

export function createApp({
  config,
  databaseHealth,
  logger,
  now,
}: AppDependencies): Express {
  const app = express()
  const healthService = createHealthService({ databaseHealth, now })

  app.disable('x-powered-by')
  app.use(requestIdMiddleware)
  app.use(createRequestLogger(logger))
  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: config.requestBodyLimit }))

  app.use('/api/v1/health', createHealthRouter(healthService))

  app.use(notFoundMiddleware)
  app.use(createErrorHandler(logger))

  return app
}
