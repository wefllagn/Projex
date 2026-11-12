export const SIMILARITY_LIMITS = {
  peers: 100,
  sourceBytes: 512 * 1024,
  tokens: 50_000,
  matches: 5,
} as const

const WINDOW_SIZE = 5
const MINIMUM_WINDOWS = 20
const ALGORITHM = 'java-token-jaccard-v1'

export interface SimilarityCandidate {
  id: string
  student: { fullName: string }
  attemptNumber: number
  submittedAt: Date
  sourceCode: string
}

export interface SimilarityInput {
  sourceCode: string
  starterCode: string
  entryClassName: string
  candidates: SimilarityCandidate[]
}

type ScoreStatus = 'ready' | 'insufficient_source' | 'unsupported_source' | 'no_comparable_submissions' | 'workload_limit'

interface Match {
  submissionId: string
  studentName: string
  attemptNumber: number
  submittedAt: Date
  sharedWindows: number
  totalWindows: number
  percentage: number
}

export function similarityResult(
  status: ScoreStatus,
  candidateCount = 0,
  comparedCount = 0,
  matches: Match[] = [],
) {
  return { status, algorithm: ALGORITHM, candidateCount, comparedCount, matches }
}

const identifier = /[A-Za-z_$][A-Za-z0-9_$]*/y
const number = /(?:0[xX][0-9a-fA-F_]+(?:\.[0-9a-fA-F_]*)?(?:[pP][+-]?[\d_]+)?[fFdDlL]?|0[bB][01_]+[lL]?|(?:\d[\d_]*(?:\.[\d_]*)?|\.[\d_]+)(?:[eE][+-]?[\d_]+)?[fFdDlL]?)/y
const symbol = />>>=|>>>|>>=|<<=|>>|<<|\.\.\.|::|->|\+\+|--|&&|\|\||[=<>!+\-*/%&|^]=|[(){}[\];,.@?:~!+\-*/%&|^=<>]/y

type LexResult =
  | { kind: 'ok'; tokens: string[] }
  | { kind: 'unsupported'; tokensUsed: number }
  | { kind: 'limit' }

function tokenAt(pattern: RegExp, source: string, index: number): string | undefined {
  pattern.lastIndex = index
  return pattern.exec(source)?.[0]
}

function quotedEnd(source: string, start: number): number {
  const quote = source[start]
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\r' || character === '\n') return -1
    if (character === quote) return index + 1
    if (character === '\\') {
      index += 1
      if (source[index] === '\r' || source[index] === '\n') return -1
    }
  }
  return -1
}

// A conservative lexical subset. Unicode escape translation and text blocks
// require additional Java rules. Decline those inputs rather than guess.
function tokenize(source: string, remaining: number): LexResult {
  if (source.includes('\\u')) return { kind: 'unsupported', tokensUsed: 0 }
  const tokens: string[] = []
  const closing: string[] = []
  let index = source.charCodeAt(0) === 0xfeff ? 1 : 0
  while (index < source.length) {
    const character = source[index]!
    if (' \t\r\n\f'.includes(character)) {
      index += 1
      continue
    }
    if (source.startsWith('//', index)) {
      index += 2
      while (index < source.length && source[index] !== '\r' && source[index] !== '\n') index += 1
      continue
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2)
      if (end < 0) return { kind: 'unsupported', tokensUsed: tokens.length }
      index = end + 2
      continue
    }
    if (tokens.length >= remaining) return { kind: 'limit' }
    if (source.startsWith('"""', index) || source.startsWith('<<<<<<<', index)
      || source.startsWith('=======', index) || source.startsWith('>>>>>>>', index)) {
      return { kind: 'unsupported', tokensUsed: tokens.length }
    }

    if (character === '"' || character === "'") {
      const end = quotedEnd(source, index)
      if (end < 0) return { kind: 'unsupported', tokensUsed: tokens.length }
      tokens.push(source.slice(index, end))
      index = end
      continue
    }

    const token = tokenAt(identifier, source, index)
      ?? tokenAt(number, source, index)
      ?? tokenAt(symbol, source, index)
    if (!token) return { kind: 'unsupported', tokensUsed: tokens.length }
    if (token === '(') closing.push(')')
    if (token === '[') closing.push(']')
    if (token === '{') closing.push('}')
    if ((token === ')' || token === ']' || token === '}') && closing.pop() !== token) {
      return { kind: 'unsupported', tokensUsed: tokens.length }
    }
    tokens.push(token)
    index += token.length
  }
  return closing.length ? { kind: 'unsupported', tokensUsed: tokens.length } : { kind: 'ok', tokens }
}

function windows(tokens: string[], excluded = new Set<string>()): Set<string> {
  let start = 0
  while (tokens[start] === 'package' || tokens[start] === 'import') {
    const end = tokens.indexOf(';', start + 1)
    if (end < 0) return new Set()
    start = end + 1
  }
  const result = new Set<string>()
  for (let index = start; index + WINDOW_SIZE <= tokens.length; index += 1) {
    const key = JSON.stringify(tokens.slice(index, index + WINDOW_SIZE))
    if (!excluded.has(key)) result.add(key)
  }
  return result
}

function starterWindows(tokens: string[], entryClassName: string): Set<string> {
  const result = windows(tokens)
  for (const parameter of [['[', ']'], ['...']]) {
    const scaffold = [
      'public', 'class', entryClassName, '{', 'public', 'static', 'void',
      'main', '(', 'String', ...parameter, 'args', ')', '{', '}', '}',
    ]
    for (const window of windows(scaffold)) result.add(window)
  }
  return result
}

function sharedCount(left: Set<string>, right: Set<string>): number {
  if (left.size > right.size) return sharedCount(right, left)
  let shared = 0
  for (const window of left) if (right.has(window)) shared += 1
  return shared
}

function compareMatches(left: Match, right: Match): number {
  const scoreOrder = right.sharedWindows * left.totalWindows - left.sharedWindows * right.totalWindows
  if (scoreOrder !== 0) return scoreOrder
  if (left.submissionId === right.submissionId) return 0
  return left.submissionId < right.submissionId ? -1 : 1
}

export function compareJavaSubmissions(input: SimilarityInput) {
  const { candidates, starterCode, sourceCode, entryClassName } = input
  const candidateCount = candidates.length
  const totalBytes = candidates.reduce(
    (bytes, candidate) => bytes + Buffer.byteLength(candidate.sourceCode),
    Buffer.byteLength(starterCode) + Buffer.byteLength(sourceCode),
  )
  if (candidateCount > SIMILARITY_LIMITS.peers || totalBytes > SIMILARITY_LIMITS.sourceBytes) {
    return similarityResult('workload_limit')
  }

  let remaining = SIMILARITY_LIMITS.tokens
  const starter = tokenize(starterCode, remaining)
  if (starter.kind !== 'ok') {
    return similarityResult(starter.kind === 'limit' ? 'workload_limit' : 'unsupported_source', candidateCount)
  }
  remaining -= starter.tokens.length

  const reference = tokenize(sourceCode, remaining)
  if (reference.kind !== 'ok') {
    return similarityResult(reference.kind === 'limit' ? 'workload_limit' : 'unsupported_source', candidateCount)
  }
  remaining -= reference.tokens.length
  const excluded = starterWindows(starter.tokens, entryClassName)
  const baseline = windows(reference.tokens, excluded)
  if (baseline.size < MINIMUM_WINDOWS) return similarityResult('insufficient_source', candidateCount)

  const matches: Match[] = []
  for (const candidate of candidates) {
    const parsed = tokenize(candidate.sourceCode, remaining)
    if (parsed.kind === 'limit') return similarityResult('workload_limit')
    if (parsed.kind === 'unsupported') {
      remaining -= parsed.tokensUsed
      continue
    }
    remaining -= parsed.tokens.length
    const peer = windows(parsed.tokens, excluded)
    if (peer.size < MINIMUM_WINDOWS) continue

    const sharedWindows = sharedCount(baseline, peer)
    const totalWindows = baseline.size + peer.size - sharedWindows
    const percentage = sharedWindows === totalWindows ? 100
      : Math.min(99.99, Math.round(10_000 * sharedWindows / totalWindows) / 100)
    matches.push({
      submissionId: candidate.id,
      studentName: candidate.student.fullName,
      attemptNumber: candidate.attemptNumber,
      submittedAt: candidate.submittedAt,
      sharedWindows,
      totalWindows,
      percentage,
    })
  }

  if (!matches.length) return similarityResult('no_comparable_submissions', candidateCount)
  matches.sort(compareMatches)
  return similarityResult('ready', candidateCount, matches.length, matches.slice(0, SIMILARITY_LIMITS.matches))
}
