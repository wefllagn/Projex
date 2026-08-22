export function normalizeJavaOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function areJavaOutputsEquivalent(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeJavaOutput(expected)
  const normalizedActual = normalizeJavaOutput(actual)

  if (normalizedExpected === normalizedActual) return true
  if (normalizedExpected.length === 0 || normalizedActual.length === 0) return false

  const expectedHasTerminalLf = normalizedExpected.endsWith('\n')
  const actualHasTerminalLf = normalizedActual.endsWith('\n')
  if (expectedHasTerminalLf === actualHasTerminalLf) return false

  const withTerminalLf = expectedHasTerminalLf ? normalizedExpected : normalizedActual
  const withoutTerminalLf = expectedHasTerminalLf ? normalizedActual : normalizedExpected

  return !withoutTerminalLf.endsWith('\n') && withTerminalLf === `${withoutTerminalLf}\n`
}
