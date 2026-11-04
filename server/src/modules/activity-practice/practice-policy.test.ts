import { describe, expect, it } from 'vitest'
import { officialPracticeComplete } from './practice-policy.js'
const released = { countsTowardAttemptLimit: true, submissionStatus: 'RELEASED', gradingModeSnapshot: 'GRADED', releasedAt: new Date(), releasedFinalScore: 0, feedback: { releasedAt: new Date() } }
describe('final activity practice eligibility', () => {
  it.each([1,2,3])('requires every one of %s permitted attempts, even after a release', max => {
    for(let used=0;used<=max;used++) expect(officialPracticeComplete(max,Array.from({length:used},()=>released),false)).toBe(used===max)
  })
  it.each(['QUEUED','ASSESSING','ASSESSED','ASSESSMENT_FAILED','REVIEWED'])('blocks any pending %s attempt, including an earlier attempt', status => {
    const pending={...released,submissionStatus:status,releasedAt:null,releasedFinalScore:null}
    expect(officialPracticeComplete(2,[pending,released],false)).toBe(false)
    expect(officialPracticeComplete(2,[released,pending],false)).toBe(false)
  })
  it('requires final released score and feedback, accepts authoritative empty feedback, and ignores credit ranking',()=>{
    expect(officialPracticeComplete(2,[{...released,releasedFinalScore:10},{...released,releasedFinalScore:100}],false)).toBe(true)
    for(const changes of [{releasedAt:null},{releasedFinalScore:null},{feedback:{releasedAt:null}},{gradingModeSnapshot:'COMPLETION'},{submissionStatus:'FAILED_RESOLVED'}]) expect(officialPracticeComplete(1,[{...released,...changes}],false)).toBe(false)
    expect(officialPracticeComplete(1,[{...released,feedback:null}],false)).toBe(false)
  })
  it('suspends for valid replacements and requires the replacement final result before resuming',()=>{
    expect(officialPracticeComplete(1,[released],true)).toBe(false)
    expect(officialPracticeComplete(1,[{...released,countsTowardAttemptLimit:false,submissionStatus:'QUEUED'},released],false)).toBe(false)
    expect(officialPracticeComplete(1,[{...released,countsTowardAttemptLimit:false},released],false)).toBe(true)
    expect(officialPracticeComplete(2,[{...released,countsTowardAttemptLimit:false},released],false)).toBe(false)
  })
})
