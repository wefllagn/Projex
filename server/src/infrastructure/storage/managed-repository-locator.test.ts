import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  deriveManagedRepositoryLocator,
  ManagedRepositoryLocatorError,
  resolveManagedRepositoryLocation,
  validateManagedRepositoryLocator,
} from './managed-repository-locator.js'

const REPOSITORY_ID = 'A1B2C3D4-1111-4111-8111-111111111111'
const NORMALIZED_ID = REPOSITORY_ID.toLowerCase()
const CANONICAL = `repositories/a1/b2/${NORMALIZED_ID}.git`
const LEGACY_WINDOWS = `repositories\\a1\\b2\\${NORMALIZED_ID}.git`

describe('managed repository locator', () => {
  it('derives a lowercase forward-slash locator and UUID buckets', () => {
    expect(deriveManagedRepositoryLocator(REPOSITORY_ID)).toMatchObject({
      repositoryId: NORMALIZED_ID,
      components: ['repositories', 'a1', 'b2', `${NORMALIZED_ID}.git`],
      canonicalLocator: CANONICAL,
      legacyWindowsLocator: LEGACY_WINDOWS,
    })
    expect(CANONICAL).not.toContain('\\')
  })

  it('accepts only the exact canonical and legacy Windows representations', () => {
    expect(validateManagedRepositoryLocator(REPOSITORY_ID, CANONICAL).canonicalLocator).toBe(CANONICAL)
    expect(validateManagedRepositoryLocator(REPOSITORY_ID, LEGACY_WINDOWS).canonicalLocator).toBe(CANONICAL)
  })

  it('resolves canonical and legacy locators to the same server-derived location', () => {
    const firstRoot = path.resolve('temporary-root-one')
    const secondRoot = path.resolve('temporary-root-two')
    const canonical = resolveManagedRepositoryLocation({
      root: firstRoot,
      repositoryId: REPOSITORY_ID,
      persistedLocator: CANONICAL,
    })
    const legacy = resolveManagedRepositoryLocation({
      root: firstRoot,
      repositoryId: REPOSITORY_ID,
      persistedLocator: LEGACY_WINDOWS,
    })
    const relocated = resolveManagedRepositoryLocation({
      root: secondRoot,
      repositoryId: REPOSITORY_ID,
      persistedLocator: LEGACY_WINDOWS,
    })
    expect(legacy.repositoryPath).toBe(canonical.repositoryPath)
    expect(relocated.repositoryPath).toBe(path.join(secondRoot, ...canonical.components))
    expect(relocated.canonicalLocator).toBe(canonical.canonicalLocator)
    expect(relocated.repositoryPath).not.toBe(canonical.repositoryPath)
  })

  it.each([
    ['mixed separators', `repositories/a1\\b2/${NORMALIZED_ID}.git`],
    ['POSIX absolute', `/repositories/a1/b2/${NORMALIZED_ID}.git`],
    ['Windows drive', `C:\\repositories\\a1\\b2\\${NORMALIZED_ID}.git`],
    ['UNC', `\\\\server\\share\\repositories\\a1\\b2\\${NORMALIZED_ID}.git`],
    ['slash traversal', `repositories/a1/../b2/${NORMALIZED_ID}.git`],
    ['backslash traversal', `repositories\\a1\\..\\b2\\${NORMALIZED_ID}.git`],
    ['wrong first bucket', `repositories/ff/b2/${NORMALIZED_ID}.git`],
    ['wrong second bucket', `repositories/a1/ff/${NORMALIZED_ID}.git`],
    ['wrong UUID', 'repositories/a1/b2/a1b2c3d4-1111-4111-8111-222222222222.git'],
    ['wrong extension', `repositories/a1/b2/${NORMALIZED_ID}.bare`],
    ['extra segment', `repositories/a1/b2/extra/${NORMALIZED_ID}.git`],
    ['missing segment', `repositories/a1/${NORMALIZED_ID}.git`],
    ['trailing separator', `${CANONICAL}/`],
    ['doubled separator', `repositories//a1/b2/${NORMALIZED_ID}.git`],
  ])('rejects %s locator input', (_label, persistedLocator) => {
    expect(() => validateManagedRepositoryLocator(REPOSITORY_ID, persistedLocator)).toThrowError(
      new ManagedRepositoryLocatorError('STORAGE_PATH_MISMATCH'),
    )
  })

  it('rejects malformed repository UUID identity', () => {
    expect(() => deriveManagedRepositoryLocator('not-a-uuid')).toThrowError(
      new ManagedRepositoryLocatorError('INVALID_STORAGE_IDENTIFIER'),
    )
  })
})
