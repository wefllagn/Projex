export interface PublicCapabilities {
  profile: 'LOCAL_FULL' | 'HOSTED_SAFE'
  java: { execution: boolean }
  git: { provisioning: boolean; inspection: boolean; smartHttp: boolean }
}

export function createCapabilitiesService(capabilities: PublicCapabilities, smartHttpReady?: () => Promise<boolean>) {
  const snapshot = Object.freeze({
    profile: capabilities.profile,
    java: Object.freeze({ execution: capabilities.java.execution }),
    git: Object.freeze({
      provisioning: capabilities.git.provisioning,
      inspection: capabilities.git.inspection,
      smartHttp: capabilities.git.smartHttp,
    }),
  })
  return { get: () => smartHttpReady
    ? smartHttpReady().catch(() => false).then(ready => ({ ...snapshot, git: { ...snapshot.git, smartHttp: snapshot.git.smartHttp && ready } }))
    : snapshot }
}
