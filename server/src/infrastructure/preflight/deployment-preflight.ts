export type PreflightResult = {
  check: string
  status: 'PASS' | 'DISABLED' | 'BLOCKING'
  code: string
}

export interface DeploymentPreflightChecks {
  database(): Promise<void>
  migrations(): Promise<void>
  git(): Promise<void>
  java(): Promise<void>
}

async function checked(check: string, passCode: string, failureCode: string, operation: () => Promise<void>): Promise<PreflightResult> {
  try {
    await operation()
    return { check, status: 'PASS', code: passCode }
  } catch {
    return { check, status: 'BLOCKING', code: failureCode }
  }
}

export async function runDeploymentPreflight(input: {
  gitEnabled: boolean
  javaEnabled: boolean
  checks: DeploymentPreflightChecks
}): Promise<PreflightResult[]> {
  const results: PreflightResult[] = []
  const database = await checked('database', 'DATABASE_REACHABLE', 'DATABASE_UNAVAILABLE', input.checks.database)
  results.push(database)
  if (database.status === 'PASS') results.push(await checked('migrations', 'MIGRATIONS_CURRENT', 'MIGRATIONS_NOT_CURRENT', input.checks.migrations))
  results.push(input.gitEnabled
    ? await checked('git-runtime', 'GIT_RUNTIME_READY', 'GIT_RUNTIME_NOT_READY', input.checks.git)
    : { check: 'git-runtime', status: 'DISABLED', code: 'GIT_DISABLED' })
  results.push(input.javaEnabled
    ? await checked('java-runtime', 'JAVA_RUNTIME_READY', 'JAVA_RUNTIME_NOT_READY', input.checks.java)
    : { check: 'java-runtime', status: 'DISABLED', code: 'JAVA_DISABLED' })
  return results
}
