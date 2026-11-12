import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { SubmissionRepository } from './submission.repository.js'
import { compareJavaSubmissions, SIMILARITY_LIMITS, type SimilarityCandidate } from './submission-similarity.js'
import { createSubmissionService } from './submission.service.js'

const starter = 'public class Main { public static void main(String[] args) {} }'
const answer = `public class Main {
  public static void main(String[] args) {
    int sum = 0;
    for (int next = 1; next <= 10; next++) {
      if (next % 2 == 0) sum += next * next;
    }
    String label = "Result // total: ";
    System.out.println(label + sum);
  }
}`
const different = `public class Main {
  public static void main(String[] args) {
    String value = "radar";
    boolean palindrome = true;
    for (int i = 0; i < value.length() / 2; i++) {
      palindrome &= value.charAt(i) == value.charAt(value.length() - 1 - i);
    }
    System.out.println(palindrome ? "yes" : "no");
  }
}`

function peer(id: string, sourceCode: string): SimilarityCandidate {
  return { id, sourceCode, student: { fullName: 'Synthetic student' }, attemptNumber: 2, submittedAt: new Date(0) }
}

function compare(sourceCode: string, candidates: SimilarityCandidate[], starterCode = starter) {
  return compareJavaSubmissions({ sourceCode, starterCode, entryClassName: 'Main', candidates })
}

describe('Java submission similarity', () => {
  it('ranks shared code above a different solution and treats formatting and comments as irrelevant', () => {
    const reformatted = ('import java.util.Scanner;\n' + answer)
      .replace('int sum = 0;', '/* remark */ int  sum=0; // remark')
      .replaceAll('\n', '\r\n')
    const edited = answer.replace('<= 10', '<= 11')
    const result = compare(answer, [peer('different', different), peer('edited', edited), peer('format', reformatted)])

    expect(result).toMatchObject({ status: 'ready', candidateCount: 3, comparedCount: 3 })
    expect(result.matches.map((match) => match.submissionId)).toEqual(['format', 'edited', 'different'])
    expect(result.matches[0]?.percentage).toBe(100)
    expect(result.matches[1]?.percentage).toBeLessThan(100)
    expect(result.matches[2]?.percentage).toBeLessThan(25)
    for (const match of result.matches) {
      expect(match.percentage).toBeCloseTo(100 * match.sharedWindows / match.totalWindows, 2)
    }
  })

  it('keeps comment-like text, escaped quotes and operators inside the lexical comparison', () => {
    const quoted = answer.replace('Result // total: ', 'Result \\" /* value */ ')
    const withComment = quoted.replace('int sum', '/* public class Other {} */ int sum')
    const result = compare(quoted, [peer('same', withComment), peer('changed', quoted.replace('/* value */', '/* different */'))])
    expect(result.matches.map((match) => match.submissionId)).toEqual(['same', 'changed'])
    expect(result.matches[0]?.percentage).toBe(100)
    expect(result.matches[1]?.percentage).toBeLessThan(100)
  })

  it('withholds scores for starter-only code, common scaffolding, and tiny edits to a large template', () => {
    const tinyEdit = answer.replace('<= 10', '<= 11')
    expect(compare(answer, [peer('copy', answer)], answer).status).toBe('insufficient_source')
    expect(compare(tinyEdit, [peer('copy', tinyEdit)], answer).status).toBe('insufficient_source')
    expect(compare(starter, [peer('copy', starter)], '').status).toBe('insufficient_source')
    expect(compare(answer, [peer('tiny', starter)])).toMatchObject({ status: 'no_comparable_submissions', matches: [] })
  })

  it.each([
    answer.slice(0, -1),
    answer + ' /* unfinished',
    answer.replace('"Result // total: "', '"unfinished'),
    answer.replace('"Result // total: "', '"""\ntext\n"""'),
    answer.replace('sum', '\\u0073um'),
    answer.replace('int sum', '<<<<<<< HEAD\nint sum'),
  ])('declines unsupported or incomplete source', (source) => {
    expect(compare(source, [peer('other', answer)])).toMatchObject({ status: 'unsupported_source', matches: [] })
  })

  it('skips unsupported peers and returns a bounded, deterministic ranking on ties', () => {
    const copies = ['g', 'f', 'e', 'd', 'c', 'b', 'a'].map((id) => peer(id, answer))
    const result = compare(answer, [peer('unsupported', 'class Main {'), ...copies])
    expect(result).toMatchObject({ candidateCount: 8, comparedCount: 7 })
    expect(result.matches.map((match) => match.submissionId)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('declines the entire request at the peer, byte, or token limit without publishing a partial ranking', () => {
    const many = Array.from({ length: SIMILARITY_LIMITS.peers + 1 }, (_, i) => peer(String(i), answer))
    const large = peer('large', '/*' + 'x'.repeat(SIMILARITY_LIMITS.sourceBytes) + '*/')
    const tokenHeavy = peer('tokens', 'class Main { void run() {' + 'n++;'.repeat(17_000) + '} }')
    for (const peers of [many, [large], [peer('otherwise-good', answer), tokenHeavy]]) {
      expect(compare(answer, peers)).toMatchObject({ status: 'workload_limit', matches: [] })
    }
  })
})

it('bounds simultaneous comparison requests and releases capacity after a failure', async () => {
  let finish!: () => void
  const firstRead = new Promise<void>((resolve) => { finish = resolve })
  const loadSimilarity = vi.fn()
    .mockImplementationOnce(async () => {
      await firstRead
      throw new Error('Synthetic query failure')
    })
    .mockImplementationOnce(async () => {
      await firstRead
      return { kind: 'workload_limit' }
    })
    .mockResolvedValue({ kind: 'workload_limit' })
  const service = createSubmissionService({
    repository: { loadSimilarity } as unknown as SubmissionRepository,
    logger: pino({ level: 'silent' }),
    config: { mode: 'disabled', sourceLimitBytes: 100_000, practiceRunTtlHours: 1, practiceRunsPerMinute: 1, practiceMaxActivePerActivity: 1 },
  })
  const instructor = { id: 'instructor', role: 'INSTRUCTOR', status: 'ACTIVE' } as SafeUserProfile

  const first = expect(service.compareSimilarity(instructor, 'first')).rejects.toThrow('Synthetic query failure')
  const second = expect(service.compareSimilarity(instructor, 'second')).resolves.toMatchObject({ status: 'workload_limit' })
  await expect(service.compareSimilarity(instructor, 'blocked')).rejects.toMatchObject({ statusCode: 429 })
  expect(loadSimilarity).toHaveBeenCalledTimes(2)
  finish()
  await Promise.all([first, second])
  await expect(service.compareSimilarity(instructor, 'retry')).resolves.toMatchObject({ status: 'workload_limit' })
})
