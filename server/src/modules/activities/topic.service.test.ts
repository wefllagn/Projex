import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { authorizeTopics, createTopicService } from './topic.service.js'
import { topicChangeSchema } from './topic.routes.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
const caller = (role = 'INSTRUCTOR', id = 'primary', status = 'ACTIVE') => ({ id, role, status } as SafeUserProfile)
const record = () => ({ instructorId: 'primary', status: 'ACTIVE', topicVersion: 3, teachingStaff: [{ instructorId: 'co', status: 'ACTIVE' }], members: [{ studentId: 'student', status: 'ACTIVE' }] })
function fixture() {
  const tx = {
    $queryRaw: vi.fn(), $executeRaw: vi.fn(),
    class: { findUnique: vi.fn().mockResolvedValue(record()), update: vi.fn() },
    classTopic: { findMany: vi.fn().mockResolvedValue([{ id: 'topic', name: 'Java', position: 0 }]), count: vi.fn().mockResolvedValue(1), findFirst: vi.fn().mockResolvedValue({ id: 'topic', position: 1 }), aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create: vi.fn().mockResolvedValue({ id: 'new-topic' }), update: vi.fn(), delete: vi.fn() },
  }
  const prisma = { $transaction: (operation: (transaction: typeof tx) => unknown) => operation(tx) } as unknown as PrismaClient
  return { tx, service: createTopicService(prisma) }
}
describe('Class Topics authorization, privacy and ordering', () => {
  it('allows only Primary and active Co-Instructors to organize Topics', () => {
    expect(() => authorizeTopics(caller(), record(), true)).not.toThrow()
    expect(() => authorizeTopics(caller('INSTRUCTOR', 'co'), record(), true)).not.toThrow()
    for (const user of [caller('ADMIN'), caller('STUDENT', 'student'), caller('INSTRUCTOR', 'other'), caller('INSTRUCTOR', 'co', 'INACTIVE')]) expect(() => authorizeTopics(user, record(), true)).toThrow()
    expect(() => authorizeTopics(caller('INSTRUCTOR', 'co'), { ...record(), teachingStaff: [{ instructorId: 'co', status: 'REMOVED' }] }, true)).toThrow()
    expect(() => authorizeTopics(caller(), { ...record(), status: 'ARCHIVED' }, true)).toThrow()
  })
  it('filters Student Topics in SQL by published/closed work before count and pagination', async () => {
    const { tx, service } = fixture()
    await service.list(caller('STUDENT', 'student'), 'class', 2)
    expect(tx.classTopic.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { classId: 'class', activities: { some: { status: { in: ['PUBLISHED', 'CLOSED'] } } } }, skip: 100, take: 100, select: { id: true, name: true, position: true } }))
    expect(tx.classTopic.count.mock.calls[0]![0].where).toEqual(tx.classTopic.findMany.mock.calls[0]![0].where)
    await service.list(caller(), 'class', 1)
    expect(tx.classTopic.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { classId: 'class' } }))
  })
  it('rejects stale mutations before any topic write', async () => {
    const { tx, service } = fixture()
    await expect(service.change(caller(), 'class', { expectedVersion: 2, action: 'remove', topicId: 'topic' })).rejects.toMatchObject({ code: 'STALE_TOPIC_VERSION' })
    expect(tx.classTopic.delete).not.toHaveBeenCalled()
    expect(tx.$executeRaw).not.toHaveBeenCalled()
  })
  it('appends in creation order and serializes each organization mutation', async () => {
    const { tx, service } = fixture()
    expect(await service.change(caller('INSTRUCTOR', 'co'), 'class', { expectedVersion: 3, action: 'create', name: 'Midterms' })).toEqual({ version: 4, createdId: 'new-topic' })
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    expect(tx.classTopic.create).toHaveBeenCalledWith({ data: { classId: 'class', name: 'Midterms', position: 5 } })
  })
  it('swaps the adjacent Topic positions atomically without changing Activity order', async () => {
    const { tx, service } = fixture()
    tx.classTopic.findFirst.mockResolvedValueOnce({ id: 'topic', position: 1 }).mockResolvedValueOnce({ id: 'neighbor', position: 0 })
    await service.change(caller(), 'class', { expectedVersion: 3, action: 'up', topicId: 'topic' })
    expect(tx.classTopic.update.mock.calls).toEqual([[{ where: { id: 'topic' }, data: { position: 0 } }], [{ where: { id: 'neighbor' }, data: { position: 1 } }]])
    expect(tx.$executeRaw).not.toHaveBeenCalled()
  })
  it('removal moves Activities to No topic, advances their version and deletes only the Topic', async () => {
    const { tx, service } = fixture()
    await service.change(caller(), 'class', { expectedVersion: 3, action: 'remove', topicId: 'topic' })
    expect(tx.$executeRaw).toHaveBeenCalledOnce()
    expect(tx.$executeRaw.mock.calls[0]![0].join(' ')).toContain("updated_at + interval '1 millisecond'")
    expect(tx.classTopic.delete).toHaveBeenCalledWith({ where: { id: 'topic' } })
    expect(tx.class.update).toHaveBeenCalledWith({ where: { id: 'class' }, data: { topicVersion: { increment: 1 } } })
  })
  it('requires bounded names, known actions and explicit versions', () => {
    for (const input of [{ action: 'create', expectedVersion: 0, name: ' ' }, { action: 'remove', expectedVersion: 0 }, { action: 'create', name: 'Java' }, { action: 'deleteEverything', expectedVersion: 0 }]) expect(topicChangeSchema.safeParse(input).success).toBe(false)
  })
})
