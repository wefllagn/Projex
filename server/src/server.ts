import 'dotenv/config'
import { createServer, type Server } from 'node:http'
import { createApp } from './app.js'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import {
  createPrismaClient,
  createPrismaDatabaseHealth,
} from './infrastructure/database/prisma.js'
import { createLogger } from './infrastructure/logging/logger.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger(env.logLevel)
  const prisma = createPrismaClient(env.databaseUrl)
  const app = createApp({
    config: {
      frontendOrigin: env.frontendOrigin,
      requestBodyLimit: env.requestBodyLimit,
    },
    databaseHealth: createPrismaDatabaseHealth(prisma),
    logger,
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
