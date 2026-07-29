import { PrismaClient } from '@prisma/client'

export interface DatabaseHealth {
  checkConnection(): Promise<void>
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
  })
}

export function createPrismaDatabaseHealth(prisma: PrismaClient): DatabaseHealth {
  return {
    async checkConnection() {
      await prisma.$queryRaw`SELECT 1`
    },
  }
}
