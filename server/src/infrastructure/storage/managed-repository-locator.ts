import path from 'node:path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ManagedRepositoryLocatorError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'ManagedRepositoryLocatorError'
  }
}

export type ManagedRepositoryLocator = Readonly<{
  repositoryId: string
  components: readonly ['repositories', string, string, string]
  canonicalLocator: string
  legacyWindowsLocator: string
}>

export type ResolvedManagedRepositoryLocation = ManagedRepositoryLocator & Readonly<{
  repositoryPath: string
}>

export function isManagedRepositoryUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function deriveManagedRepositoryLocator(repositoryId: string): ManagedRepositoryLocator {
  if (!isManagedRepositoryUuid(repositoryId)) {
    throw new ManagedRepositoryLocatorError('INVALID_STORAGE_IDENTIFIER')
  }
  const normalizedId = repositoryId.toLowerCase()
  const components = [
    'repositories',
    normalizedId.slice(0, 2),
    normalizedId.slice(2, 4),
    `${normalizedId}.git`,
  ] as const
  return {
    repositoryId: normalizedId,
    components,
    canonicalLocator: components.join('/'),
    legacyWindowsLocator: components.join('\\'),
  }
}

export function validateManagedRepositoryLocator(
  repositoryId: string,
  persistedLocator: string,
): ManagedRepositoryLocator {
  const locator = deriveManagedRepositoryLocator(repositoryId)
  if (
    persistedLocator !== locator.canonicalLocator &&
    persistedLocator !== locator.legacyWindowsLocator
  ) {
    throw new ManagedRepositoryLocatorError('STORAGE_PATH_MISMATCH')
  }
  return locator
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

export function resolveManagedRepositoryLocation(input: {
  root: string
  repositoryId: string
  persistedLocator?: string
}): ResolvedManagedRepositoryLocation {
  if (!path.isAbsolute(input.root)) {
    throw new ManagedRepositoryLocatorError('GIT_STORAGE_ROOT_NOT_ABSOLUTE')
  }
  const locator = input.persistedLocator === undefined
    ? deriveManagedRepositoryLocator(input.repositoryId)
    : validateManagedRepositoryLocator(input.repositoryId, input.persistedLocator)
  const root = path.resolve(input.root)
  const repositoryPath = path.resolve(root, ...locator.components)
  if (!isWithin(root, repositoryPath)) {
    throw new ManagedRepositoryLocatorError('STORAGE_PATH_ESCAPE')
  }
  return { ...locator, repositoryPath }
}
