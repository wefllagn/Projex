import { describe,expect,it } from 'vitest'
import { browserRefInput,isBrowserBranchName } from './group-browser-ref.schemas.js'
const valid={operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:'feature/greeting',expectedSourceCommitHash:'a'.repeat(40),expectedTargetCommitHash:null}
describe('Group browser ref validation',()=>{
  it('accepts bounded creation and exact-revision fast forwards',()=>{
    expect(browserRefInput.safeParse(valid).success).toBe(true)
    expect(browserRefInput.safeParse({...valid,operation:'FAST_FORWARD',sourceBranchName:'feature/a',targetBranchName:'main',expectedTargetCommitHash:'b'.repeat(40)}).success).toBe(true)
  })
  it.each(['HEAD','head','refs/heads/a','projex/job','main/','a//b','.hidden/a','a/.hidden','a/../b','a..b','-flag','a b','a.lock','a.LOCK','CON','a\\b','a@{x}','a~1','a\nnext'])('rejects unsafe/reserved branch %s',name=>expect(isBrowserBranchName(name)).toBe(false))
  it('rejects protected-main creation, missing revisions and unsupported fields',()=>{
    for(const input of [{...valid,targetBranchName:'main'},{...valid,targetBranchName:'MAIN'},{...valid,targetBranchName:'feature/greeting',expectedTargetCommitHash:'b'.repeat(40)},{...valid,operation:'FAST_FORWARD'},{...valid,expectedSourceCommitHash:'HEAD'},{...valid,force:true}]) expect(browserRefInput.safeParse(input).success).toBe(false)
  })
})
