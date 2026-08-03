import {
  cleanIntegrationDatabase,
  createIntegrationPrisma,
} from './database.js'

export default function setupIntegrationSuite(): () => Promise<void> {
  return async () => {
    const prisma = createIntegrationPrisma()
    try {
      await cleanIntegrationDatabase(prisma)
    } finally {
      await prisma.$disconnect()
    }
  }
}
