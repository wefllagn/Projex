import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'

export type QuiescenceSnapshot = Readonly<{
  runningExecutionJobs: number
  runningProvisioningJobs: number
  provisioningRepositories: number
  stagingEntries: number
  transportRequestEntries: number
}>

export type QuiescenceAssessment = Readonly<{
  safe: boolean
  blockers: readonly string[]
}>

async function entryCount(directory: string): Promise<number> {
  return readdir(directory).then((entries) => entries.length).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return 0
    throw error
  })
}

export async function readQuiescenceSnapshot(
  prisma: PrismaClient,
  gitStorageRoot: string,
): Promise<QuiescenceSnapshot> {
  const [runningExecutionJobs, runningProvisioningJobs, provisioningRepositories, stagingEntries, transportRequestEntries] =
    await Promise.all([
      prisma.executionJob.count({ where: { status: 'RUNNING' } }),
      prisma.repositoryProvisioningJob.count({ where: { status: 'RUNNING' } }),
      prisma.repository.count({ where: { storageStatus: 'PROVISIONING' } }),
      entryCount(path.join(gitStorageRoot, 'staging')),
      entryCount(path.join(gitStorageRoot, 'transport', 'requests')),
    ])
  return {
    runningExecutionJobs,
    runningProvisioningJobs,
    provisioningRepositories,
    stagingEntries,
    transportRequestEntries,
  }
}

export function assessQuiescence(snapshot: QuiescenceSnapshot): QuiescenceAssessment {
  const blockers: string[] = []
  if (snapshot.runningExecutionJobs > 0) blockers.push('EXECUTION_JOBS_RUNNING')
  if (snapshot.runningProvisioningJobs > 0) blockers.push('PROVISIONING_JOBS_RUNNING')
  if (snapshot.provisioningRepositories > 0) blockers.push('REPOSITORIES_PROVISIONING')
  if (snapshot.stagingEntries > 0) blockers.push('GIT_STAGING_NOT_EMPTY')
  if (snapshot.transportRequestEntries > 0) blockers.push('GIT_TRANSPORT_RECOVERY_REQUIRED')
  return { safe: blockers.length === 0, blockers }
}
