import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import { OperationsSafetyError } from './operations-error.js'

function normalized(value: string): string {
  const result = path.resolve(value)
  return process.platform === 'win32' ? result.toLowerCase() : result
}

export function pathsOverlap(left: string, right: string): boolean {
  const a = normalized(left)
  const b = normalized(right)
  return a === b || a.startsWith(`${b}${path.sep}`) || b.startsWith(`${a}${path.sep}`)
}

async function rejectLinksOnExistingSegments(target: string): Promise<void> {
  const absolute = path.resolve(target)
  const parsed = path.parse(absolute)
  const relative = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)
  let current = parsed.root
  for (const segment of relative) {
    current = path.join(current, segment)
    const metadata = await lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (!metadata) break
    if (metadata.isSymbolicLink()) {
      throw new OperationsSafetyError('OPERATIONS_PATH_LINK_REJECTED')
    }
  }
}

export async function canonicalExistingDirectory(target: string): Promise<string> {
  if (!path.isAbsolute(target)) throw new OperationsSafetyError('OPERATIONS_PATH_NOT_ABSOLUTE')
  if (path.parse(path.resolve(target)).root === path.resolve(target)) {
    throw new OperationsSafetyError('OPERATIONS_PATH_TOO_BROAD')
  }
  await rejectLinksOnExistingSegments(target)
  const canonical = await realpath(target).catch(() => {
    throw new OperationsSafetyError('OPERATIONS_PATH_NOT_FOUND')
  })
  const metadata = await lstat(canonical)
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new OperationsSafetyError('OPERATIONS_PATH_NOT_DIRECTORY')
  }
  return canonical
}

export async function canonicalPlannedDirectory(target: string): Promise<string> {
  if (!path.isAbsolute(target)) throw new OperationsSafetyError('OPERATIONS_PATH_NOT_ABSOLUTE')
  const absolute = path.resolve(target)
  if (path.parse(absolute).root === absolute) {
    throw new OperationsSafetyError('OPERATIONS_PATH_TOO_BROAD')
  }
  await rejectLinksOnExistingSegments(absolute)
  let existing = absolute
  while (true) {
    const metadata = await lstat(existing).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (metadata) break
    const parent = path.dirname(existing)
    if (parent === existing) throw new OperationsSafetyError('OPERATIONS_PATH_PARENT_NOT_FOUND')
    existing = parent
  }
  const canonicalParent = await realpath(existing)
  return path.join(canonicalParent, path.relative(existing, absolute))
}

export async function validateBackupPaths(input: {
  projectRoot: string
  gitStorageRoot: string
  backupOutputRoot: string
  testGitStorageRoot?: string
}): Promise<{ gitStorageRoot: string; backupOutputRoot: string }> {
  const projectRoot = await canonicalExistingDirectory(input.projectRoot)
  const gitStorageRoot = await canonicalExistingDirectory(input.gitStorageRoot)
  const backupOutputRoot = await canonicalPlannedDirectory(input.backupOutputRoot)
  const protectedPaths = [projectRoot]
  if (input.testGitStorageRoot) {
    protectedPaths.push(await canonicalPlannedDirectory(input.testGitStorageRoot))
  }
  if (protectedPaths.some((item) => pathsOverlap(gitStorageRoot, item))) {
    throw new OperationsSafetyError('GIT_STORAGE_PROTECTED_PATH_OVERLAP')
  }
  if ([gitStorageRoot, ...protectedPaths].some((item) => pathsOverlap(backupOutputRoot, item))) {
    throw new OperationsSafetyError('BACKUP_OUTPUT_PATH_OVERLAP')
  }
  return { gitStorageRoot, backupOutputRoot }
}

export async function validateRestorePaths(input: {
  projectRoot: string
  backupSourceRoot: string
  restoreGitRoot: string
  normalGitStorageRoot?: string
  testGitStorageRoot?: string
}): Promise<{ backupSourceRoot: string; restoreGitRoot: string }> {
  const projectRoot = await canonicalExistingDirectory(input.projectRoot)
  const backupSourceRoot = await canonicalExistingDirectory(input.backupSourceRoot)
  const restoreGitRoot = await canonicalPlannedDirectory(input.restoreGitRoot)
  const protectedPaths = [projectRoot]
  for (const item of [input.normalGitStorageRoot, input.testGitStorageRoot]) {
    if (item) protectedPaths.push(await canonicalPlannedDirectory(item))
  }
  if (protectedPaths.some((item) => pathsOverlap(backupSourceRoot, item))) {
    throw new OperationsSafetyError('RESTORE_SOURCE_PROTECTED_PATH_OVERLAP')
  }
  if (pathsOverlap(backupSourceRoot, restoreGitRoot)) {
    throw new OperationsSafetyError('RESTORE_SOURCE_DESTINATION_OVERLAP')
  }
  if (protectedPaths.some((item) => pathsOverlap(restoreGitRoot, item))) {
    throw new OperationsSafetyError('RESTORE_DESTINATION_PROTECTED_PATH_OVERLAP')
  }
  return { backupSourceRoot, restoreGitRoot }
}
