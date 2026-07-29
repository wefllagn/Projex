import type { DatabaseHealth } from '../../infrastructure/database/prisma.js'
import { AppError } from '../../shared/errors/app-error.js'
import { healthDataSchema, type HealthData } from './health.schemas.js'

export interface HealthService {
  check(): Promise<HealthData>
}

export interface HealthServiceDependencies {
  databaseHealth: DatabaseHealth
  now?: () => Date
}

export function createHealthService({
  databaseHealth,
  now = () => new Date(),
}: HealthServiceDependencies): HealthService {
  return {
    async check() {
      try {
        await databaseHealth.checkConnection()
      } catch (cause) {
        throw new AppError({
          statusCode: 503,
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database connectivity check failed.',
          cause,
        })
      }

      return healthDataSchema.parse({
        status: 'ok',
        database: 'connected',
        timestamp: now().toISOString(),
      })
    },
  }
}
