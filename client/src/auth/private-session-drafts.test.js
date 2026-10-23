import { afterEach, expect, it } from 'vitest'
import { activityDraftKey, clearPrivateSessionDrafts, readActivityDraft, writeActivityDraft } from './private-session-drafts.js'
afterEach(() => sessionStorage.clear())
it('scopes recovery to one account, Class and Activity, expires it and clears private payloads', () => {
 const key = activityDraftKey('teacher', 'class', 'draft')
 writeActivityDraft(key, { form: { title: 'Draft' }, tests: [{ expectedOutput: 'private' }] })
 expect(readActivityDraft(key)?.form.title).toBe('Draft')
 expect(readActivityDraft(activityDraftKey('other', 'class', 'draft'))).toBeNull()
 const old = JSON.parse(sessionStorage.getItem(key)); old.savedAt -= 9 * 60 * 60 * 1000; sessionStorage.setItem(key, JSON.stringify(old))
 expect(readActivityDraft(key)).toBeNull()
 writeActivityDraft(key, { form: {}, tests: [] }); sessionStorage.setItem('unrelated', 'retained')
 clearPrivateSessionDrafts(); expect(sessionStorage.getItem(key)).toBeNull(); expect(sessionStorage.getItem('unrelated')).toBe('retained')
})
