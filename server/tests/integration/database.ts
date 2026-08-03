import { PrismaClient, type UserRole } from '@prisma/client'
import { requireTestDatabaseUrl } from './test-database-url.js'

export function createIntegrationPrisma(): PrismaClient {
  const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
  return new PrismaClient({ datasourceUrl: databaseUrl })
}

export async function cleanIntegrationDatabase(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.testCaseResult.deleteMany()
  await prisma.submissionFeedback.deleteMany()
  await prisma.similarityResult.deleteMany()
  await prisma.submissionExecution.deleteMany()
  await prisma.activitySubmission.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.programmingActivity.deleteMany()
  await prisma.repositoryFeedback.deleteMany()
  await prisma.repositoryActivity.deleteMany()
  await prisma.repositoryMember.deleteMany()
  await prisma.repository.deleteMany()
  await prisma.projectTask.deleteMany()
  await prisma.classMember.deleteMany()
  await prisma.class.deleteMany()
  await prisma.accountSetupToken.deleteMany()
  await prisma.refreshSession.deleteMany()
  await prisma.user.deleteMany()
}

let sequence = 0

export async function createActiveUser(
  prisma: PrismaClient,
  role: UserRole,
  name = `${role} Integration User`,
) {
  sequence += 1
  return prisma.user.create({
    data: {
      fullName: name,
      email: `${role.toLowerCase()}-${sequence}@integration.test`,
      passwordHash: 'integration-test-password-hash',
      role,
      status: 'ACTIVE',
    },
  })
}
