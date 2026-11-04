import { Prisma, type PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createPrismaSubmissionRepository } from './submission.repository.js'

const input = {
  activityId: '11111111-1111-4111-8111-111111111111', studentId: '22222222-2222-4222-8222-222222222222',
  sourceCode: 'class Main {}', sourceHash: 'hash', payloadHash: 'hash', idempotencyKeyHash: 'key', now: new Date(),
}
const rollback = () => new Prisma.PrismaClientKnownRequestError('Test serialization rollback', { code: 'P2034', clientVersion: 'test' })

describe('submission transaction conflict recovery', () => {
  it('bounds serialization retries and returns a safe conflict when all transactions rolled back', async () => {
    const transaction = vi.fn().mockRejectedValue(rollback())
    const repository = createPrismaSubmissionRepository({ $transaction: transaction } as unknown as PrismaClient)
    await expect(repository.createSubmission(input)).resolves.toEqual({ kind: 'concurrent_conflict' })
    expect(transaction).toHaveBeenCalledTimes(3)
  })

  it('does not replay an unknown database failure with an uncertain commit outcome', async () => {
    const failure = new Error('Test connection failure')
    const transaction = vi.fn().mockRejectedValue(failure)
    const repository = createPrismaSubmissionRepository({ $transaction: transaction } as unknown as PrismaClient)
    await expect(repository.createSubmission(input)).rejects.toBe(failure)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
