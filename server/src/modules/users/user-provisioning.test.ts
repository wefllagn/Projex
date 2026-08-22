import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import pino from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import { createPreviewEmailClient } from '../../infrastructure/email/preview-email-client.js'
import type { EmailClient, EmailMessage } from '../../infrastructure/email/email.types.js'
import { createTokenService } from '../auth/auth.tokens.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  ProvisioningResult,
  ResendResult,
  StatusUpdateResult,
  UserProvisioningRepository,
} from './user-provisioning.repository.js'
import { provisionStudentSchema } from './user-provisioning.schemas.js'
import { createUserProvisioningService } from './user-provisioning.service.js'

const admin: SafeUserProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Admin User',
  email: 'admin@projex.local',
  role: 'ADMIN',
  status: 'ACTIVE',
}
const instructor: SafeUserProfile = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  fullName: 'Instructor User',
  email: 'instructor@slu.edu',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const student: SafeUserProfile = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  fullName: 'Student User',
  email: 'student@slu.edu',
  role: 'STUDENT',
  status: 'SETUP_PENDING',
}
const classId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const requestId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const expectedUpdatedAt = new Date('2026-07-30T05:59:00.000Z')
const tempDirectories: string[] = []

afterEach(async () => {
  while (tempDirectories.length) {
    const directory = tempDirectories.pop()
    if (directory?.startsWith(tmpdir())) {
      await rm(directory, { recursive: true, force: true })
    }
  }
})

class FakeProvisioningRepository implements UserProvisioningRepository {
  studentResult: ProvisioningResult = { kind: 'created', user: student }
  instructorResult: ProvisioningResult = {
    kind: 'created',
    user: { ...instructor, status: 'SETUP_PENDING' },
  }
  resendResult: ResendResult = { kind: 'created', user: student }
  statusResult: StatusUpdateResult = {
    kind: 'updated',
    user: { ...student, status: 'SUSPENDED' },
    changed: true,
  }
  lastStudentInput?: Parameters<UserProvisioningRepository['createStudent']>[0]
  lastInstructorInput?: Parameters<
    UserProvisioningRepository['createInstructor']
  >[0]
  lastResendInput?: Parameters<
    UserProvisioningRepository['replaceSetupToken']
  >[0]
  lastStatusInput?: Parameters<UserProvisioningRepository['updateStatus']>[0]

  async createStudent(input: Parameters<UserProvisioningRepository['createStudent']>[0]) {
    this.lastStudentInput = input
    return this.studentResult
  }

  async createInstructor(
    input: Parameters<UserProvisioningRepository['createInstructor']>[0],
  ) {
    this.lastInstructorInput = input
    return this.instructorResult
  }

  async replaceSetupToken(
    input: Parameters<UserProvisioningRepository['replaceSetupToken']>[0],
  ) {
    this.lastResendInput = input
    return this.resendResult
  }

  async updateStatus(input: Parameters<UserProvisioningRepository['updateStatus']>[0]) {
    this.lastStatusInput = input
    return this.statusResult
  }
}

function createHarness(options?: {
  repository?: FakeProvisioningRepository
  emailClient?: EmailClient
  logger?: pino.Logger
  frontendOrigin?: string
}) {
  const repository = options?.repository ?? new FakeProvisioningRepository()
  const sent: EmailMessage[] = []
  const tokenService = createTokenService('c'.repeat(64), 15)
  const emailClient: EmailClient =
    options?.emailClient ??
    ({
      async send(message) {
        sent.push(message)
        return {}
      },
    } satisfies EmailClient)
  const service = createUserProvisioningService({
    repository,
    tokenService,
    emailClient,
    logger: options?.logger ?? pino({ level: 'silent' }),
    frontendOrigin: options?.frontendOrigin ?? 'http://localhost:5173',
    setupTokenTtlHours: 24,
    now: () => new Date('2026-07-30T06:00:00.000Z'),
  })
  return { repository, service, sent, tokenService }
}

describe('user provisioning policy', () => {
  it('provisions a student as SETUP_PENDING without accepting a caller-selected role', async () => {
    const { repository, service, tokenService } = createHarness({
      frontendOrigin: 'http://192.0.2.20:5173',
    })
    const result = await service.provisionStudent(admin, {
      fullName: 'Student User',
      universityEmail: 'student@slu.edu',
    }, requestId)
    expect(result.user.status).toBe('SETUP_PENDING')
    expect(repository.lastStudentInput).not.toHaveProperty('role')
    expect(repository.lastStudentInput?.token.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.manualSetupLink).toMatchObject({
      setupLink: expect.stringMatching(
        /^http:\/\/192\.0\.2\.20:5173\/account-setup#token=/,
      ),
      expiresAt: new Date('2026-07-31T06:00:00.000Z'),
    })
    const rawToken = new URL(result.manualSetupLink!.setupLink).hash
      .replace(/^#token=/, '')
    expect(repository.lastStudentInput?.token.tokenHash).toBe(
      tokenService.hashOpaqueToken(decodeURIComponent(rawToken)),
    )
    expect(JSON.stringify(repository.lastStudentInput)).not.toContain(rawToken)
    expect(provisionStudentSchema.safeParse({
      fullName: 'Student User',
      universityEmail: 'student@slu.edu',
      role: 'ADMIN',
    }).success).toBe(false)
  })

  it('requires classId for instructor student provisioning', async () => {
    const { service } = createHarness()
    await expect(
      service.provisionStudent(instructor, {
        fullName: 'Student User',
        universityEmail: 'student@slu.edu',
      }),
    ).rejects.toMatchObject({ code: 'CLASS_ID_REQUIRED' })
  })

  it('does not expose a manual setup link to an instructor provisioning a student', async () => {
    const { service } = createHarness()
    const result = await service.provisionStudent(instructor, {
      fullName: 'Student User',
      universityEmail: 'student@slu.edu',
      classId,
    })
    expect(result.user.status).toBe('SETUP_PENDING')
    expect(result.manualSetupLink).toBeNull()
  })

  it('requires the instructor to own the supplied class', async () => {
    const repository = new FakeProvisioningRepository()
    repository.studentResult = { kind: 'class_not_owned' }
    const { service } = createHarness({ repository })
    await expect(
      service.provisionStudent(instructor, {
        fullName: 'Student User',
        universityEmail: 'student@slu.edu',
        classId,
      }),
    ).rejects.toMatchObject({ code: 'CLASS_OWNERSHIP_REQUIRED' })
  })

  it('rejects provisioning into an archived class', async () => {
    const repository = new FakeProvisioningRepository()
    repository.studentResult = { kind: 'class_archived' }
    const { service } = createHarness({ repository })
    await expect(
      service.provisionStudent(admin, {
        fullName: 'Student User',
        universityEmail: 'student@slu.edu',
        classId,
      }, requestId),
    ).rejects.toMatchObject({ code: 'CLASS_ARCHIVED', statusCode: 409 })
  })

  it('prevents an instructor from provisioning instructor or admin accounts', async () => {
    const { service } = createHarness()
    await expect(
      service.provisionInstructor(instructor, {
        fullName: 'Another Instructor',
        universityEmail: 'another@slu.edu',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows an administrator to provision an instructor', async () => {
    const { repository, service } = createHarness()
    const result = await service.provisionInstructor(admin, {
      fullName: 'Instructor User',
      universityEmail: 'instructor@slu.edu',
    }, requestId)
    expect(result.user.role).toBe('INSTRUCTOR')
    expect(result.user.status).toBe('SETUP_PENDING')
    expect(result.manualSetupLink?.setupLink).toContain('/account-setup#token=')
    expect(repository.lastInstructorInput).not.toHaveProperty('role')
  })

  it('returns a safe duplicate-email conflict', async () => {
    const repository = new FakeProvisioningRepository()
    repository.studentResult = { kind: 'duplicate_email' }
    const { service } = createHarness({ repository })
    await expect(
      service.provisionStudent(admin, {
        fullName: 'Student User',
        universityEmail: 'student@slu.edu',
      }, requestId),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS', statusCode: 409 })
  })

  it('enforces the five-minute resend cooldown', async () => {
    const repository = new FakeProvisioningRepository()
    repository.resendResult = { kind: 'cooldown' }
    const { service } = createHarness({ repository })
    await expect(service.resendSetup(admin, student.id, requestId)).rejects.toMatchObject({
      code: 'SETUP_RESEND_COOLDOWN',
      statusCode: 429,
    })
  })

  it('replaces setup tokens through one repository transaction boundary', async () => {
    const { repository, service } = createHarness()
    const manualSetupLink = await service.resendSetup(admin, student.id, requestId)
    expect(repository.lastResendInput?.token.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(repository.lastResendInput?.cooldownCutoff).toEqual(
      new Date('2026-07-30T05:55:00.000Z'),
    )
    expect(manualSetupLink).toMatchObject({
      setupLink: expect.stringContaining('/account-setup#token='),
      expiresAt: new Date('2026-07-31T06:00:00.000Z'),
    })
  })

  it('keeps setup reissue mail-only for an authorized instructor', async () => {
    const { service } = createHarness()
    await expect(service.resendSetup(instructor, student.id)).resolves.toBeNull()
  })

  it('rejects reissue for an account that is no longer setup-pending', async () => {
    const repository = new FakeProvisioningRepository()
    repository.resendResult = { kind: 'not_pending' }
    const { service } = createHarness({ repository })
    await expect(service.resendSetup(admin, student.id, requestId)).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_SETUP_PENDING',
      statusCode: 409,
    })
  })

  it('delegates suspension to the transactional status repository operation', async () => {
    const { repository, service } = createHarness()
    const result = await service.updateStatus(
      admin,
      student.id,
      {
        status: 'SUSPENDED',
        reason: 'Investigating a confirmed account security incident.',
        expectedUpdatedAt,
      },
      requestId,
    )
    expect(result.status).toBe('SUSPENDED')
    expect(repository.lastStatusInput).toMatchObject({
      userId: student.id,
      status: 'SUSPENDED',
      expectedUpdatedAt,
    })
  })

  it('rejects administrative self-suspension before the repository mutation', async () => {
    const { repository, service } = createHarness()
    await expect(
      service.updateStatus(
        admin,
        admin.id,
        {
          status: 'SUSPENDED',
          reason: 'Routine administrative self-suspension request.',
          expectedUpdatedAt,
        },
        requestId,
      ),
    ).rejects.toMatchObject({
      code: 'ADMIN_SELF_DISABLE_FORBIDDEN',
      statusCode: 409,
    })
    expect(repository.lastStatusInput).toBeUndefined()
  })

  it('rejects inactive administrators at the service boundary', async () => {
    const { repository, service } = createHarness()
    await expect(
      service.updateStatus(
        { ...admin, status: 'SUSPENDED' },
        student.id,
        {
          status: 'SUSPENDED',
          reason: 'Investigating a confirmed account security incident.',
          expectedUpdatedAt,
        },
        requestId,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    expect(repository.lastStatusInput).toBeUndefined()
  })

  it('creates an ignored local preview containing a fragment setup link without logging it', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'projex-mail-test-'))
    tempDirectories.push(directory)
    let logs = ''
    const logger = pino(
      { level: 'info' },
      { write: (chunk: string) => { logs += chunk } },
    )
    const preview = createPreviewEmailClient(directory, logger)
    const { service } = createHarness({ emailClient: preview, logger })
    await service.provisionStudent(admin, {
      fullName: 'Student User',
      universityEmail: 'student@slu.edu',
    }, requestId)
    const files = await readdir(directory)
    expect(files).toHaveLength(1)
    const content = await readFile(path.join(directory, files[0]!), 'utf8')
    expect(content).toContain('/account-setup#token=')
    expect(content).not.toContain('/account-setup?token=')
    const token = content.match(/#token=([^"<]+)/)?.[1]
    expect(token).toBeTruthy()
    expect(logs).not.toContain(token!)
    expect(logs).not.toContain('/account-setup#token=')
  })
})
