const recognizedTestDatabases = new Set(['projex_test'])

export function requireTestDatabaseUrl(input: string | undefined): string {
  if (!input) throw new Error('TEST_DATABASE_URL is required.')

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new Error('TEST_DATABASE_URL is invalid.')
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('TEST_DATABASE_URL must use PostgreSQL.')
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!recognizedTestDatabases.has(databaseName)) {
    throw new Error('TEST_DATABASE_URL does not name a recognized test database.')
  }

  return input
}
