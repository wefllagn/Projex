import { randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
const MARKER_FILE = 'projex-repository.json'
const TEST_SENTINEL = '.projex-test-run.json'

export class RepositoryStorageError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'RepositoryStorageError'
  }
}

export interface RepositoryStoragePaths {
  relativeRepositoryPath: string
  repositoryPath: string
  stagingPath: string
  quarantinePath: string
}

interface Marker {
  version: 1
  repositoryId: string
  provisioningJobId: string
}

function normalizedForComparison(value: string): string {
  const normalized = path.resolve(value).replace(/[\\/]+$/, '')
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function isWithin(parent: string, candidate: string): boolean {
  const parentKey = normalizedForComparison(parent)
  const candidateKey = normalizedForComparison(candidate)
  return candidateKey === parentKey || candidateKey.startsWith(`${parentKey}${path.sep}`)
}

function assertSafeComponent(component: string): void {
  if (
    component.length === 0 ||
    component === '.' ||
    component === '..' ||
    component.endsWith('.') ||
    component.endsWith(' ') ||
    component.includes(':') ||
    WINDOWS_RESERVED.test(component)
  ) {
    throw new RepositoryStorageError('UNSAFE_STORAGE_COMPONENT')
  }
}

async function rejectLinksOnExistingPath(target: string): Promise<void> {
  const resolved = path.resolve(target)
  const parsed = path.parse(resolved)
  const relative = path.relative(parsed.root, resolved)
  let current = parsed.root
  for (const component of relative.split(path.sep).filter(Boolean)) {
    assertSafeComponent(component)
    current = path.join(current, component)
    try {
      const entry = await lstat(current)
      if (entry.isSymbolicLink()) {
        throw new RepositoryStorageError('STORAGE_REPARSE_POINT_REJECTED')
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
  }
}

async function directorySize(root: string, limit: number): Promise<number> {
  let total = 0
  const pending = [root]
  while (pending.length > 0) {
    const current = pending.pop()!
    const { readdir } = await import('node:fs/promises')
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const itemPath = path.join(current, entry.name)
      if (entry.isSymbolicLink()) {
        throw new RepositoryStorageError('STORAGE_REPARSE_POINT_REJECTED')
      }
      if (entry.isDirectory()) {
        pending.push(itemPath)
      } else if (entry.isFile()) {
        total += (await stat(itemPath)).size
        if (total > limit) throw new RepositoryStorageError('REPOSITORY_SIZE_LIMIT_EXCEEDED')
      } else {
        throw new RepositoryStorageError('UNSUPPORTED_STORAGE_ENTRY')
      }
    }
  }
  return total
}

export function createRepositoryStorage(options: {
  root: string
  repositorySizeLimitBytes: number
}) {
  if (!path.isAbsolute(options.root)) {
    throw new RepositoryStorageError('GIT_STORAGE_ROOT_NOT_ABSOLUTE')
  }
  const configuredRoot = path.resolve(options.root)

  function pathsFor(repositoryId: string, provisioningJobId: string): RepositoryStoragePaths {
    if (!UUID_PATTERN.test(repositoryId) || !UUID_PATTERN.test(provisioningJobId)) {
      throw new RepositoryStorageError('INVALID_STORAGE_IDENTIFIER')
    }
    const normalizedId = repositoryId.toLowerCase()
    const relativeRepositoryPath = path.join(
      'repositories',
      normalizedId.slice(0, 2),
      normalizedId.slice(2, 4),
      `${normalizedId}.git`,
    )
    const repositoryPath = path.resolve(configuredRoot, relativeRepositoryPath)
    const stagingPath = path.resolve(
      configuredRoot,
      'staging',
      `${normalizedId}-${provisioningJobId.toLowerCase()}`,
    )
    const quarantinePath = path.resolve(
      configuredRoot,
      'quarantine',
      `${normalizedId}-${provisioningJobId.toLowerCase()}`,
    )
    for (const candidate of [repositoryPath, stagingPath, quarantinePath]) {
      if (!isWithin(configuredRoot, candidate)) {
        throw new RepositoryStorageError('STORAGE_PATH_ESCAPE')
      }
    }
    return { relativeRepositoryPath, repositoryPath, stagingPath, quarantinePath }
  }

  async function resolveManagedRepository(
    repositoryId: string,
    relativeRepositoryPath: string,
  ): Promise<string> {
    if (!UUID_PATTERN.test(repositoryId)) {
      throw new RepositoryStorageError('INVALID_STORAGE_IDENTIFIER')
    }
    const normalizedId = repositoryId.toLowerCase()
    const expected = path.join(
      'repositories',
      normalizedId.slice(0, 2),
      normalizedId.slice(2, 4),
      `${normalizedId}.git`,
    )
    if (normalizedForComparison(relativeRepositoryPath) !== normalizedForComparison(expected)) {
      throw new RepositoryStorageError('STORAGE_PATH_MISMATCH')
    }
    const canonicalRoot = await initializeRoot()
    const candidate = path.resolve(canonicalRoot, relativeRepositoryPath)
    if (!isWithin(canonicalRoot, candidate) || candidate === canonicalRoot) {
      throw new RepositoryStorageError('STORAGE_PATH_ESCAPE')
    }
    await rejectLinksOnExistingPath(candidate)
    const canonicalRepository = await realpath(candidate).catch(() => {
      throw new RepositoryStorageError('REPOSITORY_STORAGE_NOT_FOUND')
    })
    if (!isWithin(canonicalRoot, canonicalRepository)) {
      throw new RepositoryStorageError('STORAGE_PATH_ESCAPE')
    }
    const marker = JSON.parse(
      await readFile(path.join(canonicalRepository, MARKER_FILE), 'utf8').catch(() => {
        throw new RepositoryStorageError('STORAGE_MARKER_INVALID')
      }),
    ) as Partial<Marker>
    if (marker.version !== 1 || marker.repositoryId !== repositoryId) {
      throw new RepositoryStorageError('STORAGE_MARKER_MISMATCH')
    }
    return canonicalRepository
  }

  async function initializeRoot(): Promise<string> {
    await rejectLinksOnExistingPath(configuredRoot)
    await mkdir(configuredRoot, { recursive: true })
    await rejectLinksOnExistingPath(configuredRoot)
    const canonical = await realpath(configuredRoot)
    if (normalizedForComparison(canonical) !== normalizedForComparison(configuredRoot)) {
      throw new RepositoryStorageError('STORAGE_ROOT_CANONICAL_MISMATCH')
    }
    return canonical
  }

  async function prepareStaging(paths: RepositoryStoragePaths, marker: Marker): Promise<void> {
    await initializeRoot()
    await rejectLinksOnExistingPath(paths.stagingPath)
    await mkdir(path.dirname(paths.stagingPath), { recursive: true })
    await rejectLinksOnExistingPath(path.dirname(paths.stagingPath))
    try {
      await mkdir(paths.stagingPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await verifyMarker(paths.stagingPath, marker)
      return
    }
    await rejectLinksOnExistingPath(paths.stagingPath)
    await writeFile(
      path.join(paths.stagingPath, MARKER_FILE),
      `${JSON.stringify(marker)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    )
  }

  async function verifyMarker(directory: string, expected: Marker): Promise<void> {
    await rejectLinksOnExistingPath(directory)
    let marker: Marker
    try {
      marker = JSON.parse(await readFile(path.join(directory, MARKER_FILE), 'utf8')) as Marker
    } catch {
      throw new RepositoryStorageError('STORAGE_MARKER_INVALID')
    }
    if (
      marker.version !== 1 ||
      marker.repositoryId !== expected.repositoryId ||
      marker.provisioningJobId !== expected.provisioningJobId
    ) {
      throw new RepositoryStorageError('STORAGE_MARKER_MISMATCH')
    }
  }

  async function publish(paths: RepositoryStoragePaths, marker: Marker): Promise<void> {
    await verifyMarker(paths.stagingPath, marker)
    await mkdir(path.dirname(paths.repositoryPath), { recursive: true })
    await rejectLinksOnExistingPath(path.dirname(paths.repositoryPath))
    try {
      await rename(paths.stagingPath, paths.repositoryPath)
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error
      await verifyMarker(paths.repositoryPath, marker)
    }
  }

  async function quarantine(paths: RepositoryStoragePaths, _marker: Marker): Promise<string | null> {
    let source: string
    try {
      await lstat(paths.stagingPath)
      source = paths.stagingPath
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      try {
        await lstat(paths.repositoryPath)
        source = paths.repositoryPath
      } catch (repositoryError) {
        if ((repositoryError as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw repositoryError
      }
    }
    await mkdir(path.dirname(paths.quarantinePath), { recursive: true })
    await rejectLinksOnExistingPath(path.dirname(paths.quarantinePath))
    let candidate = paths.quarantinePath
    try {
      await lstat(candidate)
      candidate = `${candidate}-${randomUUID()}`
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await rename(source, candidate)
    return path.relative(configuredRoot, candidate)
  }

  return {
    root: configuredRoot,
    pathsFor,
    resolveManagedRepository,
    initializeRoot,
    prepareStaging,
    verifyMarker,
    publish,
    quarantine,
    async measure(directory: string) {
      if (!isWithin(configuredRoot, directory)) {
        throw new RepositoryStorageError('STORAGE_PATH_ESCAPE')
      }
      await rejectLinksOnExistingPath(directory)
      return directorySize(directory, options.repositorySizeLimitBytes)
    },
  }
}

export async function createGuardedTestRunRoot(options: {
  testRoot: string | undefined
  normalRoot?: string
  projectRoot: string
}): Promise<{ runRoot: string; cleanup(): Promise<void> }> {
  if (!options.testRoot || !path.isAbsolute(options.testRoot)) {
    throw new RepositoryStorageError('TEST_GIT_STORAGE_ROOT_REQUIRED')
  }
  const testRoot = path.resolve(options.testRoot)
  if (path.basename(testRoot).toLowerCase() !== 'projex_git_test') {
    throw new RepositoryStorageError('TEST_GIT_STORAGE_ROOT_UNRECOGNIZED')
  }
  const root = path.parse(testRoot).root
  if (normalizedForComparison(testRoot) === normalizedForComparison(root)) {
    throw new RepositoryStorageError('TEST_GIT_STORAGE_ROOT_TOO_BROAD')
  }
  if (
    isWithin(options.projectRoot, testRoot) ||
    isWithin(testRoot, options.projectRoot) ||
    (options.normalRoot &&
      (isWithin(options.normalRoot, testRoot) || isWithin(testRoot, options.normalRoot)))
  ) {
    throw new RepositoryStorageError('TEST_GIT_STORAGE_ROOT_OVERLAP')
  }
  await rejectLinksOnExistingPath(testRoot)
  await mkdir(testRoot, { recursive: true })
  await rejectLinksOnExistingPath(testRoot)
  const runId = randomUUID()
  const runRoot = path.join(testRoot, `run-${runId}`)
  await mkdir(runRoot)
  const sentinel = { version: 1, runId }
  await writeFile(path.join(runRoot, TEST_SENTINEL), `${JSON.stringify(sentinel)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  return {
    runRoot,
    async cleanup() {
      if (!isWithin(testRoot, runRoot) || runRoot === testRoot) {
        throw new RepositoryStorageError('TEST_GIT_CLEANUP_REJECTED')
      }
      await rejectLinksOnExistingPath(runRoot)
      const actual = JSON.parse(await readFile(path.join(runRoot, TEST_SENTINEL), 'utf8')) as {
        version?: number
        runId?: string
      }
      if (actual.version !== 1 || actual.runId !== runId) {
        throw new RepositoryStorageError('TEST_GIT_SENTINEL_MISMATCH')
      }
      await rm(runRoot, { recursive: true, force: false })
    },
  }
}
