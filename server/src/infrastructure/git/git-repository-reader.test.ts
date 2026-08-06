import { describe, expect, it } from 'vitest'
import {
  GitRepositoryReadError,
  isValidGitBranchName,
  isValidGitCommitId,
  normalizeGitRepositoryPath,
} from './git-repository-reader.js'

describe('Git repository inspection input guards', () => {
  it('accepts supported branch names and rejects revision expressions and unsafe refs', () => {
    expect(isValidGitBranchName('feature/student-dashboard')).toBe(true)
    expect(isValidGitBranchName('main')).toBe(true)
    for (const value of ['-main', 'HEAD', 'main^', 'main..feature', 'refs//heads/main', 'topic.lock']) {
      expect(isValidGitBranchName(value)).toBe(false)
    }
  })

  it('accepts only full hexadecimal commit IDs', () => {
    expect(isValidGitCommitId('a'.repeat(40))).toBe(true)
    expect(isValidGitCommitId('A1'.repeat(20))).toBe(true)
    expect(isValidGitCommitId('a'.repeat(39))).toBe(false)
    expect(isValidGitCommitId(`${'a'.repeat(40)}^`)).toBe(false)
  })

  it('normalizes conservative repository-relative paths and rejects traversal or Git internals', () => {
    expect(normalizeGitRepositoryPath('src/Main.java')).toBe('src/Main.java')
    expect(normalizeGitRepositoryPath('docs/Project Notes.md')).toBe('docs/Project Notes.md')
    for (const value of ['../server/.env', '/absolute.txt', 'src\\Main.java', '.git/config', 'src/file.txt:stream']) {
      expect(() => normalizeGitRepositoryPath(value)).toThrow(GitRepositoryReadError)
    }
  })
})
