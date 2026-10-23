import { randomUUID } from 'node:crypto'
import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createActivitySchema } from '../../src/modules/activities/activity.schemas.js'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { DEFAULT_GRADING_CONFIGURATION } from '../../src/modules/activities/weighted-grading.js'
import { createIntegrationPrisma, cleanIntegrationDatabase, createActiveClass, createActiveUser } from './database.js'
const prisma = createIntegrationPrisma()
const service = createActivityService({ repository: createPrismaActivityRepository(prisma), classRepository: createPrismaClassRepository(prisma), logger: pino({ level: 'silent' }) })
const definition = () => createActivitySchema.parse({ creationRequestId: randomUUID(), title: 'Guided draft', instructions: 'Read input and print the answer.', dueDate: '2099-01-01T00:00:00Z', language: 'JAVA', entryClassName: 'Main', starterCode: 'class Main {}', maxAttempts: 2, creditPolicy: 'LATEST', totalPoints: 100, gradingPeriod: 'PRELIM', gradingConfiguration: DEFAULT_GRADING_CONFIGURATION })
beforeEach(() => cleanIntegrationDatabase(prisma))
afterAll(async () => { await cleanIntegrationDatabase(prisma); await prisma.$disconnect() })
describe('guided Activity creation retry safety', () => {
  it('deduplicates concurrent creates and response-loss retries without overwriting a saved draft', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), cls = await createActiveClass(prisma, instructor.id), input = definition()
    const [one, two] = await Promise.all([service.create(instructor, cls.id, input), service.create(instructor, cls.id, input)])
    expect(one.id).toBe(input.creationRequestId); expect(two.id).toBe(one.id)
    const updated = await service.update(instructor, one.id, { title: 'Newer saved title', expectedUpdatedAt: one.updatedAt })
    const replay = await service.create(instructor, cls.id, input)
    expect(replay.title).toBe('Newer saved title'); expect(replay.updatedAt).toEqual(updated.updatedAt)
    expect(await prisma.programmingActivity.count()).toBe(1)
  })
  it('does not replay another creator or Class record and retains authorization', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), colleague = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT')
    const cls = await createActiveClass(prisma, instructor.id), other = await createActiveClass(prisma, colleague.id), input = definition()
    await service.create(instructor, cls.id, input)
    await expect(service.create(colleague, other.id, input)).rejects.toMatchObject({ code: 'ACTIVITY_CREATION_CONFLICT' })
    await expect(service.create(student, cls.id, input)).rejects.toMatchObject({ statusCode: 403 })
    expect(await prisma.programmingActivity.count()).toBe(1)
  })
  it('preserves the legacy API creation contract when no retry id is supplied', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), cls = await createActiveClass(prisma, instructor.id)
    const input = definition(); delete input.creationRequestId; delete input.gradingConfiguration
    const one = await service.create(instructor, cls.id, input), two = await service.create(instructor, cls.id, input)
    expect(one.id).not.toBe(two.id); expect(one.gradingConfiguration).toBeNull()
  })
})
