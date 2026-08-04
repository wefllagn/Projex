import { PrismaClient, type UserRole } from '@prisma/client'
import { requireTestDatabaseUrl } from './test-database-url.js'

export function createIntegrationPrisma(): PrismaClient {
  const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
  return new PrismaClient({ datasourceUrl: databaseUrl })
}

export async function cleanIntegrationDatabase(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.executionJob.deleteMany()
  await prisma.practiceExecutionCase.deleteMany()
  await prisma.practiceExecution.deleteMany()
  await prisma.testCaseResult.deleteMany()
  await prisma.submissionFeedback.deleteMany()
  await prisma.submissionScoreCorrection.deleteMany()
  await prisma.submissionFailureResolution.deleteMany()
  await prisma.submissionIdempotency.deleteMany()
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
const classCodeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function integrationClassCode(value: number): string {
  let remainder = value
  let suffix = ''
  for (let index = 0; index < 5; index += 1) {
    suffix = classCodeAlphabet[remainder % classCodeAlphabet.length]! + suffix
    remainder = Math.floor(remainder / classCodeAlphabet.length)
  }
  return `TSTAA${suffix}`
}

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

export async function createActiveClass(
  prisma: PrismaClient,
  instructorId: string,
  className = 'Integration Programming Class',
) {
  sequence += 1
  return prisma.class.create({
    data: {
      instructorId,
      className,
      classCode: integrationClassCode(sequence),
      classCodeActive: true,
      section: 'BSIT 2A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
      status: 'ACTIVE',
    },
  })
}

export async function createActiveMembership(
  prisma: PrismaClient,
  classId: string,
  studentId: string,
) {
  return prisma.classMember.create({
    data: {
      classId,
      studentId,
      status: 'ACTIVE',
    },
  })
}
