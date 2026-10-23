const PREFIX = 'origin.activity-draft:'
const MAX_AGE = 8 * 60 * 60 * 1000
export const activityDraftKey = (userId, classId, activityId = 'new') => `${PREFIX}${userId}:${classId}:${activityId}`
export function readActivityDraft(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key))
    return value?.version === 1 && Date.now() - value.savedAt < MAX_AGE && value.form && Array.isArray(value.tests) ? value : null
  } catch { return null }
}
export function writeActivityDraft(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify({ ...value, version: 1, savedAt: Date.now() })); return true } catch { return false }
}
export function removeActivityDraft(key) { try { sessionStorage.removeItem(key) } catch { /* Server draft is retained. */ } }
export function clearPrivateSessionDrafts() {
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key) } catch { /* Private storage may be disabled. */ }
}
