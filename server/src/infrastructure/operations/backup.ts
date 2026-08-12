import path from 'node:path'
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'

import { manifestChecksum, serializeManifest, type BackupManifest } from './backup-manifest.js'
import { OperationsSafetyError } from './operations-error.js'
import { validateBackupPaths } from './path-guards.js'
import { buildPgDumpPlan } from './postgres-tools.js'
import type { CommandPlan } from './process-runner.js'
import { assessQuiescence, type QuiescenceSnapshot } from './quiescence.js'

export const BACKUP_CONFIRMATION = 'CREATE_PAIRED_BACKUP'

export type PairedBackupPlan = Readonly<{
  backupId: string
  outputDirectory: string
  databaseDump: CommandPlan
  gitArchive: CommandPlan
  manifestFile: string
  manifestChecksumFile: string
}>

const WORK_MARKER = '.projex-backup-work.json'
const REPOSITORY_MARKER = 'projex-repository.json'

export async function inspectGitStorageTree(root: string): Promise<{ markerCount: number; quarantineCount: number }> {
  let markerCount = 0
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      const metadata = await lstat(target)
      if (metadata.isSymbolicLink()) throw new OperationsSafetyError('GIT_STORAGE_LINK_REJECTED')
      if (entry.isDirectory()) await visit(target)
      else if (entry.isFile()) {
        if (entry.name === REPOSITORY_MARKER) markerCount += 1
      } else {
        throw new OperationsSafetyError('GIT_STORAGE_ENTRY_UNSUPPORTED')
      }
    }
  }
  await visit(root)
  const quarantineCount = await readdir(path.join(root, 'quarantine')).then((entries) => entries.length).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return 0
    throw error
  })
  return { markerCount, quarantineCount }
}

export async function buildPairedBackupPlan(input: {
  confirmation: string
  backupId: string
  projectRoot: string
  gitStorageRoot: string
  backupOutputRoot: string
  testGitStorageRoot?: string
  databaseUrl: string
  pgDumpExecutable: string
  tarExecutable: string
  quiescence: QuiescenceSnapshot
}): Promise<PairedBackupPlan> {
  if (input.confirmation !== BACKUP_CONFIRMATION) {
    throw new OperationsSafetyError('BACKUP_CONFIRMATION_REQUIRED')
  }
  if (!/^[a-z0-9][a-z0-9-]{7,63}$/.test(input.backupId)) {
    throw new OperationsSafetyError('BACKUP_ID_INVALID')
  }
  if (!path.isAbsolute(input.tarExecutable)) {
    throw new OperationsSafetyError('TAR_EXECUTABLE_NOT_ABSOLUTE')
  }
  const quiescence = assessQuiescence(input.quiescence)
  if (!quiescence.safe) throw new OperationsSafetyError(quiescence.blockers[0] ?? 'BACKUP_NOT_QUIESCENT')
  const safePaths = await validateBackupPaths(input)
  const outputDirectory = path.join(safePaths.backupOutputRoot, `backup-${input.backupId}`)
  const databaseFile = path.join(outputDirectory, 'database.dump')
  const gitFile = path.join(outputDirectory, 'git-storage.tar')
  return {
    backupId: input.backupId,
    outputDirectory,
    databaseDump: buildPgDumpPlan({
      executable: input.pgDumpExecutable,
      databaseUrl: input.databaseUrl,
      outputFile: databaseFile,
    }),
    gitArchive: {
      executable: path.resolve(input.tarExecutable),
      args: ['-cf', gitFile, '--directory', safePaths.gitStorageRoot, '.'],
    },
    manifestFile: path.join(outputDirectory, 'manifest.json'),
    manifestChecksumFile: path.join(outputDirectory, 'manifest.sha256'),
  }
}

export async function executePairedBackupPlan(
  plan: PairedBackupPlan,
  input: {
    run(command: CommandPlan): Promise<unknown>
    buildManifest(): Promise<BackupManifest>
  },
): Promise<void> {
  const marker = `${JSON.stringify({ version: 1, backupId: plan.backupId })}\n`
  await mkdir(plan.outputDirectory, { recursive: false })
  await writeFile(path.join(plan.outputDirectory, WORK_MARKER), marker, { flag: 'wx' })
  try {
    await input.run(plan.databaseDump)
    await input.run(plan.gitArchive)
    const manifest = await input.buildManifest()
    if (manifest.backupId !== plan.backupId) throw new OperationsSafetyError('BACKUP_MANIFEST_ID_MISMATCH')
    const serialized = serializeManifest(manifest)
    await writeFile(plan.manifestFile, serialized, { flag: 'wx' })
    await writeFile(plan.manifestChecksumFile, `${manifestChecksum(manifest)}  manifest.json\n`, { flag: 'wx' })
    await rm(path.join(plan.outputDirectory, WORK_MARKER))
  } catch (error) {
    const actualMarker = await readFile(path.join(plan.outputDirectory, WORK_MARKER), 'utf8').catch(() => '')
    if (actualMarker === marker) await rm(plan.outputDirectory, { recursive: true, force: false })
    throw error
  }
}
