let fallbackSequence = 0

export function createTemporaryTestCaseId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `temporary-test-case:${cryptoApi.randomUUID()}`
  }

  fallbackSequence += 1
  const sequence = fallbackSequence.toString(36)

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    const randomPart = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
    return `temporary-test-case:${randomPart}:${sequence}`
  }

  return `temporary-test-case:${Date.now().toString(36)}:${sequence}`
}
