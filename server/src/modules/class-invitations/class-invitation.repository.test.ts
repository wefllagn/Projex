import { Prisma, type PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createPrismaClassInvitationRepository } from './class-invitation.repository.js'

function rawFailure(code: string) {
  return new Prisma.PrismaClientKnownRequestError('fixture raw-query failure', {
    code: 'P2010', clientVersion: '6.19.3', meta: { code },
  })
}
const input = { invitationId: 'fixture-invitation', studentId: 'fixture-student', now: new Date() }

describe('class invitation serialization recovery', () => {
  it('retries raw PostgreSQL serialization failure while preserving serializable isolation', async () => {
    const accepted = { kind: 'accepted', changed: false }
    const transaction = vi.fn().mockRejectedValueOnce(rawFailure('40001')).mockResolvedValue(accepted)
    const repository = createPrismaClassInvitationRepository({ $transaction: transaction } as unknown as PrismaClient)
    await expect(repository.accept(input)).resolves.toBe(accepted)
    expect(transaction).toHaveBeenCalledTimes(2)
    for (const call of transaction.mock.calls) {
      expect(call[1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    }
  })

  it('preserves the existing three-attempt retry bound', async () => {
    const failure = rawFailure('40001')
    const transaction = vi.fn().mockRejectedValue(failure)
    const repository = createPrismaClassInvitationRepository({ $transaction: transaction } as unknown as PrismaClient)
    await expect(repository.accept(input)).rejects.toBe(failure)
    expect(transaction).toHaveBeenCalledTimes(3)
  })

  it('does not retry unrelated raw-query failures', async () => {
    const failure = rawFailure('42501')
    const transaction = vi.fn().mockRejectedValue(failure)
    const repository = createPrismaClassInvitationRepository({ $transaction: transaction } as unknown as PrismaClient)
    await expect(repository.accept(input)).rejects.toBe(failure)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
