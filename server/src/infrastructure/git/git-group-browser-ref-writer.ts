import { GitInfrastructureError } from './git-errors.js'
import { BrowserCommitError } from './git-group-browser-writer.js'
import { browserRefInput, type BrowserRefInput } from '../../modules/group-browser-refs/group-browser-ref.schemas.js'

interface Runner {
  run(args: readonly string[], cwd?: string, input?: { stdin?: string }): Promise<{ stdout: string; stderr: string }>
}
export type BrowserRefWrite = BrowserRefInput & { id: string; actorId: string; repositoryId: string; storagePath: string }
export function createGitGroupBrowserRefWriter(deps: { git: Runner; resolveRepository(id: string, locator: string): Promise<string>; maxBranches: number }) {
  const locate = (job: BrowserRefWrite) => deps.resolveRepository(job.repositoryId,job.storagePath)
  async function revision(root: string, branch: string): Promise<string | null> {
    try { return (await deps.git.run(['--git-dir','.','rev-parse','--verify','refs/heads/'+branch+'^{commit}'],root)).stdout.trim() }
    catch(error) { if(error instanceof GitInfrastructureError && error.code === 'GIT_COMMAND_FAILED') return null; throw error }
  }
  const receiptRef = (job: BrowserRefWrite) => {
    if(!/^[0-9a-f-]{36}$/i.test(job.id)) throw new BrowserCommitError('BROWSER_REF_INVALID')
    return 'refs/projex/browser-refs/'+job.id
  }
  return {
    async receipt(job: BrowserRefWrite): Promise<string | null> {
      const root=await locate(job)
      let value: string
      try { value=(await deps.git.run(['--git-dir','.','rev-parse','--verify',receiptRef(job)],root)).stdout.trim() }
      catch(error) { if(error instanceof GitInfrastructureError && error.code==='GIT_COMMAND_FAILED') return null; throw error }
      if(value !== job.expectedSourceCommitHash) throw new BrowserCommitError('BROWSER_REF_INVALID')
      return value
    },
    async prepare(job: BrowserRefWrite) {
      browserRefInput.parse({operation:job.operation,sourceBranchName:job.sourceBranchName,targetBranchName:job.targetBranchName,expectedSourceCommitHash:job.expectedSourceCommitHash,expectedTargetCommitHash:job.expectedTargetCommitHash})
      const root=await locate(job)
      if(await revision(root,job.sourceBranchName)!==job.expectedSourceCommitHash) throw new BrowserCommitError('BROWSER_REF_CHANGED')
      if(job.operation==='FAST_FORWARD' && await revision(root,job.targetBranchName)!==job.expectedTargetCommitHash) throw new BrowserCommitError('BROWSER_REF_CHANGED')
      if(job.operation==='CREATE_BRANCH') {
        const refs=(await deps.git.run(['--git-dir','.','for-each-ref','--format=%(refname:strip=2)','refs/heads/'],root)).stdout.trim().split(/\r?\n/).filter(Boolean)
        const target=job.targetBranchName.toLowerCase()
        if(refs.some(ref=>ref.toLowerCase()===target || ref.toLowerCase().startsWith(target+'/') || target.startsWith(ref.toLowerCase()+'/'))) throw new BrowserCommitError('BROWSER_BRANCH_EXISTS')
        if(refs.length>=deps.maxBranches) throw new BrowserCommitError('BROWSER_BRANCH_LIMIT')
        await deps.git.run(['check-ref-format','--branch',job.targetBranchName],root)
      } else {
        if(job.expectedSourceCommitHash===job.expectedTargetCommitHash) throw new BrowserCommitError('BROWSER_ALREADY_UP_TO_DATE')
        try { await deps.git.run(['--git-dir','.','merge-base','--is-ancestor',job.expectedTargetCommitHash!,job.expectedSourceCommitHash],root) }
        catch(error) { if(error instanceof GitInfrastructureError && error.code==='GIT_COMMAND_FAILED') throw new BrowserCommitError('BROWSER_BRANCH_DIVERGED'); throw error }
      }
      return job.expectedSourceCommitHash
    },
    async publish(job: BrowserRefWrite): Promise<void> {
      const root=await locate(job)
      try {
        await deps.git.run(['--git-dir','.','update-ref','--stdin'],root,{stdin:
          'start\nverify refs/heads/'+job.sourceBranchName+' '+job.expectedSourceCommitHash+'\n'+
          (job.operation==='CREATE_BRANCH' ? 'create refs/heads/'+job.targetBranchName+' '+job.expectedSourceCommitHash : 'update refs/heads/'+job.targetBranchName+' '+job.expectedSourceCommitHash+' '+job.expectedTargetCommitHash)+
          '\ncreate '+receiptRef(job)+' '+job.expectedSourceCommitHash+'\nprepare\ncommit\n'})
      } catch(error) {
        if(error instanceof GitInfrastructureError && error.code==='GIT_COMMAND_FAILED') {
          if(await this.receipt(job)) return
          if(await revision(root,job.sourceBranchName)!==job.expectedSourceCommitHash || await revision(root,job.targetBranchName)!==job.expectedTargetCommitHash) throw new BrowserCommitError('BROWSER_REF_CHANGED')
        }
        throw error
      }
    },
  }
}
export type GitGroupBrowserRefWriter = ReturnType<typeof createGitGroupBrowserRefWriter>
