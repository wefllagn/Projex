import 'dotenv/config'
import path from 'node:path'

import { createPrismaClient } from '../infrastructure/database/prisma.js'
import { createArtifact, BACKUP_MANIFEST_VERSION, type BackupManifest } from '../infrastructure/operations/backup-manifest.js'
import { BACKUP_CONFIRMATION, buildPairedBackupPlan, executePairedBackupPlan, inspectGitStorageTree } from '../infrastructure/operations/backup.js'
import { OperationsSafetyError } from '../infrastructure/operations/operations-error.js'
import { runCommand } from '../infrastructure/operations/process-runner.js'
import { readQuiescenceSnapshot } from '../infrastructure/operations/quiescence.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new OperationsSafetyError(`${name}_REQUIRED`)
  return value
}

async function main(): Promise<void> {
  if (!process.argv.includes('--execute')) throw new OperationsSafetyError('BACKUP_EXECUTE_FLAG_REQUIRED')
  const projectRoot = path.resolve(process.cwd(), '..')
  const databaseUrl = required('DATABASE_URL')
  const gitStorageRoot = required('GIT_STORAGE_ROOT')
  const prisma = createPrismaClient(databaseUrl)
  try {
    const plan = await buildPairedBackupPlan({
      confirmation: required('OPERATIONS_BACKUP_CONFIRM'),
      backupId: required('OPERATIONS_BACKUP_ID'),
      projectRoot,
      gitStorageRoot,
      backupOutputRoot: required('OPERATIONS_BACKUP_OUTPUT_ROOT'),
      testGitStorageRoot: process.env.TEST_GIT_STORAGE_ROOT,
      databaseUrl,
      pgDumpExecutable: required('PG_DUMP_EXECUTABLE'),
      tarExecutable: required('TAR_EXECUTABLE'),
      quiescence: await readQuiescenceSnapshot(prisma, gitStorageRoot),
    })
    const storageInventory = await inspectGitStorageTree(gitStorageRoot)
    await executePairedBackupPlan(plan, {
      run: (command) => runCommand(command),
      buildManifest: async () => {
        const [database, git, migrations, userCount, classCount, activityCount, submissionCount, repositoryCount, states, serverVersion, pgDumpVersion, gitVersion] = await Promise.all([
          createArtifact(path.join(plan.outputDirectory, 'database.dump')),
          createArtifact(path.join(plan.outputDirectory, 'git-storage.tar')),
          prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
          prisma.user.count(), prisma.class.count(), prisma.programmingActivity.count(),
          prisma.activitySubmission.count(), prisma.repository.count(),
          prisma.repository.groupBy({ by: ['storageStatus'], _count: { _all: true } }),
          prisma.$queryRaw<Array<{ server_version: string }>>`SHOW server_version`,
          runCommand({ executable: required('PG_DUMP_EXECUTABLE'), args: ['--version'] }),
          runCommand({ executable: required('GIT_EXECUTABLE'), args: ['--version'] }),
        ])
        const manifest: BackupManifest = {
          manifestVersion: BACKUP_MANIFEST_VERSION,
          backupId: plan.backupId,
          createdAt: new Date().toISOString(),
          applicationCommit: required('OPERATIONS_APPLICATION_COMMIT'),
          capabilityProfile: process.env.NODE_ENV === 'production' ? 'HOSTED_SAFE' : 'LOCAL_FULL',
          tools: {
            postgres: serverVersion[0]?.server_version ?? 'unknown',
            pgDump: pgDumpVersion.stdout.trim(),
            git: gitVersion.stdout.trim(),
          },
          migrations: migrations.map((item) => item.migration_name),
          artifacts: [database, git],
          counts: { users: userCount, classes: classCount, activities: activityCount, submissions: submissionCount, repositories: repositoryCount },
          repositoryStorageStates: Object.fromEntries(states.map((item) => [item.storageStatus, item._count._all])),
          markerCount: storageInventory.markerCount,
          quarantineCount: storageInventory.quarantineCount,
          transitionalDirectoriesEmpty: true,
        }
        return manifest
      },
    })
    process.stdout.write(`${JSON.stringify({ status: 'completed', backupId: plan.backupId })}\n`)
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: 'blocked', code: error instanceof OperationsSafetyError ? error.code : 'OPERATIONS_BACKUP_FAILED' })}\n`)
  process.exitCode = 1
})

export { BACKUP_CONFIRMATION }
