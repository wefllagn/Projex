import { fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe,expect,it,vi } from 'vitest'
import GroupGitActions from './GroupGitActions.jsx'
import { ApiError } from '../api/api-client.js'
const first='a'.repeat(40),next='b'.repeat(40)
const branches=[{branchName:'main',commitId:first},{branchName:'feature/greeting',commitId:next},{branchName:'feature/target',commitId:first}]
function setup(options={}) {
  const preview={repositoryId:'repo',sourceBranchName:'feature/greeting',targetBranchName:'main',sourceCommitHash:next,targetCommitHash:first,fastForward:true,upToDate:false,commitCount:1,files:['README.md'],commits:[{commitId:next,subject:'Improve greeting'}],...options.preview}
  const api={preview:vi.fn().mockResolvedValue({data:preview}),create:vi.fn((_id,input)=>Promise.resolve({data:{jobId:'job',repositoryId:'repo',...input,status:'SUCCEEDED',commitHash:input.expectedSourceCommitHash}})),get:vi.fn(),...options.api}
  const onCreated=vi.fn(),onMerged=vi.fn(),onBusyChange=vi.fn(),onRefreshBranches=vi.fn().mockResolvedValue(undefined)
  render(<GroupGitActions repositoryId="repo" branchName="feature/greeting" head={next} branches={branches} canWrite canUpdateMain dirty disabled={false} commitAction={<button>Commit Changes</button>} onCreated={onCreated} onMerged={onMerged} onBusyChange={onBusyChange} onRefreshBranches={onRefreshBranches} pollingOptions={{initialDelayMs:1,maximumDelayMs:1}} {...options.props} api={api} />)
  return {api,onCreated,onMerged,onBusyChange,onRefreshBranches}
}
describe('Group core Git action controls',()=>{
  it('requires deliberate branch confirmation, binds the source revision and closes only on confirmed success',async()=>{
    const {api,onCreated}=setup()
    fireEvent.click(screen.getByRole('button',{name:'New Branch',exact:true}))
    expect(api.create).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog',{name:'New branch'})).toHaveTextContent('feature/greeting at bbbbbbbb')
    expect(screen.getByRole('dialog')).toHaveTextContent('unsaved edits will move')
    fireEvent.change(screen.getByLabelText('New branch name'),{target:{value:'feature/new'}})
    fireEvent.click(screen.getByRole('button',{name:'Create branch',exact:true}))
    await waitFor(()=>expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({targetBranchName:'feature/new',commitHash:next})))
    expect(api.create).toHaveBeenCalledExactlyOnceWith('repo',{operation:'CREATE_BRANCH',sourceBranchName:'feature/greeting',targetBranchName:'feature/new',expectedSourceCommitHash:next,expectedTargetCommitHash:null},expect.stringMatching(/^group-ref:/))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('cancels without a mutation and restores focus to the initiating control',async()=>{
    setup();const user=userEvent.setup(),button=screen.getByRole('button',{name:'New Branch',exact:true})
    await user.click(button);await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(button).toHaveFocus()
  })
  it('previews the exact source/target and requires a separate merge confirmation',async()=>{
    const {api,onMerged}=setup()
    fireEvent.click(screen.getByRole('button',{name:'Merge Branch',exact:true}))
    expect(api.preview).not.toHaveBeenCalled();expect(api.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Review merge'}))
    expect(await screen.findByText(/1 commit.*1 changed file/)).toBeInTheDocument()
    expect(screen.getByText('Improve greeting')).toBeInTheDocument();expect(api.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Confirm merge'}))
    await waitFor(()=>expect(onMerged).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledExactlyOnceWith('repo',{operation:'FAST_FORWARD',sourceBranchName:'feature/greeting',targetBranchName:'main',expectedSourceCommitHash:next,expectedTargetCommitHash:first},expect.any(String))
  })
  it.each([{fastForward:false,upToDate:false,text:/have diverged/},{fastForward:true,upToDate:true,text:/Already up to date/}])('refuses a non-actionable preview $text',async state=>{
    const {api}=setup({preview:state});fireEvent.click(screen.getByRole('button',{name:'Merge Branch',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Review merge'}))
    expect(await screen.findByText(state.text)).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Confirm merge'})).toBeDisabled();expect(api.create).not.toHaveBeenCalled()
  })
  it('only offers authorized feature targets to a Developer',()=>{
    setup({props:{canUpdateMain:false}});fireEvent.click(screen.getByRole('button',{name:'Merge Branch',exact:true}))
    expect(within(screen.getByLabelText('Target branch')).queryByRole('option',{name:'main',exact:true})).not.toBeInTheDocument()
    expect(screen.getByText(/Maintainer must merge changes into main/)).toBeInTheDocument()
  })
  it('blocks new mutations for read-only repositories and empty repositories',()=>{
    setup({props:{canWrite:false}})
    expect(screen.getByRole('button',{name:'New Branch',exact:true})).toBeDisabled();expect(screen.getByRole('button',{name:'Merge Branch',exact:true})).toBeDisabled()
  })
  it('invalidates a preview when a selected branch changes',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'Merge Branch',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Review merge'}));await screen.findByText(/1 commit.*1 changed file/)
    fireEvent.change(screen.getByLabelText('Target branch'),{target:{value:'feature/target'}})
    expect(screen.queryByText('Improve greeting')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Confirm merge'})).toBeDisabled()
  })
  it('keeps a failed action for explicit branch review and reports no success',async()=>{
    const create=vi.fn((_id,input)=>Promise.resolve({data:{jobId:'job',repositoryId:'repo',...input,status:'CONFLICTED',failureCode:'BROWSER_REF_CHANGED',commitHash:null}}))
    const {onCreated,onRefreshBranches}=setup({api:{create}})
    fireEvent.click(screen.getByRole('button',{name:'New Branch',exact:true}));fireEvent.change(screen.getByLabelText('New branch name'),{target:{value:'feature/new'}});fireEvent.click(screen.getByRole('button',{name:'Create branch',exact:true}))
    expect(await screen.findByRole('alert')).toHaveTextContent('branch changed')
    expect(screen.getByLabelText('New branch name')).toHaveValue('feature/new');expect(onCreated).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Review latest branches'}));await waitFor(()=>expect(onRefreshBranches).toHaveBeenCalled())
  })
  it('recovers an ambiguous request using the identical key and revision payload',async()=>{
    const create=vi.fn().mockRejectedValueOnce(new ApiError({code:'NETWORK_ERROR'})).mockImplementation((_id,input)=>Promise.resolve({data:{jobId:'job',repositoryId:'repo',...input,status:'SUCCEEDED',commitHash:input.expectedSourceCommitHash}}))
    const {onCreated}=setup({api:{create}})
    fireEvent.click(screen.getByRole('button',{name:'New Branch',exact:true}));fireEvent.change(screen.getByLabelText('New branch name'),{target:{value:'feature/network'}});fireEvent.click(screen.getByRole('button',{name:'Create branch',exact:true}))
    fireEvent.click(await screen.findByRole('button',{name:'Retry same action'}))
    await waitFor(()=>expect(onCreated).toHaveBeenCalled());expect(create.mock.calls[1]).toEqual(create.mock.calls[0])
  })
  it('waits for a durable job result and prevents repeated mutation clicks',async()=>{
    const pending={jobId:'job',repositoryId:'repo',operation:'CREATE_BRANCH',sourceBranchName:'feature/greeting',targetBranchName:'feature/queued',status:'PENDING',commitHash:null}
    const {api,onCreated}=setup({api:{create:vi.fn().mockResolvedValue({data:pending}),get:vi.fn().mockResolvedValue({data:{...pending,status:'SUCCEEDED',commitHash:next}})}})
    fireEvent.click(screen.getByRole('button',{name:'New Branch',exact:true}));fireEvent.change(screen.getByLabelText('New branch name'),{target:{value:'feature/queued'}})
    const confirm=screen.getByRole('button',{name:'Create branch',exact:true});fireEvent.click(confirm);fireEvent.click(confirm)
    await waitFor(()=>expect(onCreated).toHaveBeenCalled());expect(api.create).toHaveBeenCalledTimes(1);expect(api.get).toHaveBeenCalled()
  })
})
