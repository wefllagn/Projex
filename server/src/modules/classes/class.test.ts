import pino from 'pino'
import { describe, expect, it } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import {
  CLASS_CODE_ALPHABET,
  CLASS_CODE_LENGTH,
  formatClassCode,
  generateClassCode,
  normalizeClassCode,
} from './class-code.js'
import type {
  ClassCodeWriteResult,
  ClassRepository,
  ClassWriteResult,
  CreateClassResult,
} from './class.repository.js'
import { createClassService } from './class.service.js'
import type { ClassAccessRecord, ClassRecord } from './class.types.js'

const instructor: SafeUserProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Instructor User',
  email: 'instructor@slu.edu.ph',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const student: SafeUserProfile = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  fullName: 'Student User',
  email: 'student@slu.edu.ph',
  role: 'STUDENT',
  status: 'ACTIVE',
}
const classRecord: ClassRecord = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  instructorId: instructor.id,
  className: 'IT 112',
  classCode: 'ABCDEFGHJK',
  classCodeActive: true,
  classCodeChangedAt: new Date('2026-07-31T00:00:00.000Z'),
  section: 'BSIT 2A',
  semester: 'First Semester',
  schoolYear: '2026-2027',
  status: 'ACTIVE',
  createdAt: new Date('2026-07-31T00:00:00.000Z'),
  updatedAt: new Date('2026-07-31T00:00:00.000Z'),
  archivedAt: null,
  instructor: { id: instructor.id, fullName: instructor.fullName },
}

class FakeClassRepository implements ClassRepository {
  createResults: CreateClassResult[] = [
    { kind: 'created', classRecord },
  ]
  access: ClassAccessRecord | null = {
    classRecord,
    membership: null,
  }
  lastCreateCode?: string

  async create(input: Parameters<ClassRepository['create']>[0]) {
    this.lastCreateCode = input.classCode
    return this.createResults.shift() ?? { kind: 'collision' }
  }

  async list() {
    return { classes: [classRecord], totalItems: 1 }
  }

  async findAccess() {
    return this.access
  }

  async updateMetadata(
    _classId: string,
    input: Parameters<ClassRepository['updateMetadata']>[1],
  ) {
    return { ...classRecord, ...input }
  }

  async archive(): Promise<ClassWriteResult> {
    return {
      kind: 'updated',
      changed: true,
      classRecord: {
        ...classRecord,
        status: 'ARCHIVED',
        classCodeActive: false,
        archivedAt: new Date('2026-07-31T01:00:00.000Z'),
      },
    }
  }

  async restore(): Promise<ClassWriteResult> {
    const restored = {
      ...classRecord,
      status: 'ACTIVE' as const,
      classCodeActive: false,
    }
    if (this.access) this.access = { ...this.access, classRecord: restored }
    return {
      kind: 'updated',
      changed: true,
      classRecord: restored,
    }
  }

  async rotateCode(
    _classId: string,
    classCode: string,
  ): Promise<ClassCodeWriteResult> {
    return {
      kind: 'updated',
      classRecord: { ...classRecord, classCode },
    }
  }

  async revokeCode() {
    return { ...classRecord, classCodeActive: false }
  }
}

function createHarness(repository = new FakeClassRepository(), code = 'NPQRST2345') {
  let logs = ''
  const logger = pino(
    { level: 'info' },
    { write: (chunk: string) => { logs += chunk } },
  )
  const service = createClassService({
    repository,
    logger,
    now: () => new Date('2026-07-31T01:00:00.000Z'),
    generateCode: () => code,
  })
  return { repository, service, logs: () => logs }
}

describe('class codes', () => {
  it('generates normalized ten-character codes from the unambiguous alphabet', () => {
    const code = generateClassCode()
    expect(code).toHaveLength(CLASS_CODE_LENGTH)
    expect([...code].every((character) => CLASS_CODE_ALPHABET.includes(character))).toBe(true)
    expect(code).not.toMatch(/[01ILO]/)
  })

  it('normalizes display separators away and formats only at the boundary', () => {
    expect(normalizeClassCode(' abcde-fghjk ')).toBe('ABCDEFGHJK')
    expect(formatClassCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK')
  })
})

describe('class lifecycle service policy', () => {
  it('makes an instructor-created class self-owned and excludes the join code', async () => {
    const { repository, service, logs } = createHarness()
    const result = await service.create(instructor, {
      className: 'IT 112',
      section: 'BSIT 2A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    expect(repository.lastCreateCode).toBe('NPQRST2345')
    expect(result).not.toHaveProperty('classCode')
    expect(logs()).not.toContain('NPQRST2345')
  })

  it('requires an admin to name an active instructor', async () => {
    const { service } = createHarness()
    await expect(
      service.create({ ...instructor, role: 'ADMIN' }, {
        className: 'IT 112',
        section: 'BSIT 2A',
        semester: 'First Semester',
        schoolYear: '2026-2027',
      }),
    ).rejects.toMatchObject({ code: 'INSTRUCTOR_ID_REQUIRED' })
  })

  it('retries bounded class-code collisions', async () => {
    const repository = new FakeClassRepository()
    repository.createResults = [
      { kind: 'collision' },
      { kind: 'created', classRecord },
    ]
    let number = 0
    const service = createClassService({
      repository,
      logger: pino({ level: 'silent' }),
      generateCode: () => (number++ === 0 ? 'AAAAA22222' : 'BBBBB33333'),
    })
    await service.create(instructor, {
      className: 'IT 112',
      section: 'BSIT 2A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    expect(number).toBe(2)
    expect(repository.lastCreateCode).toBe('BBBBB33333')
  })

  it('allows only active members to view a class as a student', async () => {
    const repository = new FakeClassRepository()
    repository.access = {
      classRecord,
      membership: {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        status: 'REMOVED',
      },
    }
    const { service } = createHarness(repository)
    await expect(service.get(student, classRecord.id)).rejects.toMatchObject({
      code: 'CLASS_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('restores a class without reactivating its old code', async () => {
    const repository = new FakeClassRepository()
    repository.access = {
      classRecord: { ...classRecord, status: 'ARCHIVED', classCodeActive: false },
      membership: null,
    }
    const { service } = createHarness(repository)
    const restored = await service.restore(instructor, classRecord.id)
    expect(restored.status).toBe('ACTIVE')
    const code = await service.getJoinCode(instructor, classRecord.id)
    expect(code.active).toBe(false)
  })
})
