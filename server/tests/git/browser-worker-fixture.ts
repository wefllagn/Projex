import type { PrismaClient } from '@prisma/client'

// Prisma's client-created timestamps and a WSL PostgreSQL clock may differ.
// Make only first-claim fixture jobs due; never retry a claimed/failed job here.
export function availableBrowserWorker<T extends { processNext(workerId: string): Promise<boolean> }>(prisma: PrismaClient, worker: T): T {
  return {
    ...worker,
    async processNext(workerId: string) {
      await prisma.groupBrowserCommitJob.updateMany({ where: { status: 'PENDING', claimAttempt: 0 }, data: { availableAt: new Date(0) } })
      await prisma.groupBrowserRefJob.updateMany({ where: { status: 'PENDING', claimAttempt: 0 }, data: { availableAt: new Date(0) } })
      return worker.processNext(workerId)
    },
  }
}
