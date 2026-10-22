import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ClassContext } from '../classes/class-context.js'
import { ApiError } from '../api/api-client.js'
import GroupBrowserEditor from './GroupBrowserEditor.jsx'

const hash = 'a'.repeat(40), second = 'b'.repeat(40)
const permissionKeys = ['canRead','canWrite','canUpdateMain','canManageMembers','canInviteMembers','canReview','canRequestChanges','canSubmitForReview','canViewActivity','canEditFeedback','canArchive','canRestore']
function setup({ permissions = {}, branches = [], commits: commitOverrides = {}, git: gitOverrides = {} } = {}) {
  const context = { repositoryId:'repo', project:{id:'project',title:'Project task',status:'PUBLISHED',dueDate:'2099-01-01T00:00:00Z'}, class:{id:'class',className:'Class',status:'ACTIVE'}, team:{id:'team',name:'Group',status:'ACTIVE',activeMemberCount:2}, teachingStaff:[], currentRole:'MAINTAINER', permissions:{...Object.fromEntries(permissionKeys.map(key=>[key,false])),canRead:true,canWrite:true,canUpdateMain:true,...permissions} }
  const api = { getRepository:vi.fn().mockResolvedValue({data:{id:'repo',projectTaskId:'project',repositoryName:'Actual repository'}}), getGroupContext:vi.fn().mockResolvedValue({data:context}) }
  const getTree = vi.fn((_id,query)=>Promise.resolve({data:{commitId:query.commitId,path:query.path||'',entries:[{name:'README.md',path:'README.md',entryType:'blob',objectId:second,sizeBytes:8}]}}))
  const gitApi = {listBranches:vi.fn().mockResolvedValue({data:branches}),getTree,getFile:vi.fn((_id,query)=>Promise.resolve({data:{commitId:query.commitId,path:query.path,content:'Original',encoding:'utf-8',sizeBytes:8}})),...gitOverrides}
  const pending={jobId:'job',repositoryId:'repo',filePath:'README.md',branchName:'main',status:'PENDING',commitHash:null}
  const commits={create:vi.fn().mockResolvedValue({data:pending}),get:vi.fn().mockResolvedValue({data:{...pending,status:'SUCCEEDED',commitHash:second}}),...commitOverrides}
  render(<ClassContext.Provider value={{selectedClass:{id:'class'}}}><MemoryRouter initialEntries={['/student/projects/project/repositories/repo/editor?classId=class&branch=main']}><Routes><Route path="/student/projects/:projectTaskId/repositories/:repositoryId/editor" element={<GroupBrowserEditor api={api} gitApi={gitApi} commits={commits} pollingOptions={{initialDelayMs:1,maximumDelayMs:1,maximumDurationMs:200}} />} /></Routes></MemoryRouter></ClassContext.Provider>)
  return {api,gitApi,commits,context,pending}
}
describe('Group browser editor',()=>{
  it('commits only after an intentional message/action, then shows the actual result and refreshed files',async()=>{
    const {commits,gitApi}=setup()
    const source=await screen.findByRole('textbox',{name:'Group file source'})
    expect(screen.getByRole('heading',{name:'Actual repository'})).toBeInTheDocument()
    expect(commits.create).not.toHaveBeenCalled()
    fireEvent.change(source,{target:{value:'# Browser README\n'}})
    fireEvent.change(screen.getByLabelText('Commit message'),{target:{value:'Initialize README'}})
    expect(commits.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Commit changes'}))
    expect(await screen.findByText(/Committed bbbbbbbb/)).toBeInTheDocument()
    expect(commits.create).toHaveBeenCalledExactlyOnceWith('repo',expect.objectContaining({branchName:'main',filePath:'README.md',content:'# Browser README\n',operation:'CREATE',expectedHeadCommitHash:null,commitMessage:'Initialize README'}),expect.stringMatching(/^group:/))
    expect(await screen.findByRole('button',{name:'README.md'})).toBeInTheDocument()
    expect(gitApi.getTree).toHaveBeenCalledWith('repo',{commitId:second})
    expect(screen.queryByRole('button',{name:'Submit'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:/Run Tests|Compile/})).not.toBeInTheDocument()
  })
  it('does not let an ordinary Developer initialize protected main',async()=>{
    const {commits}=setup({permissions:{canUpdateMain:false}})
    expect(await screen.findByText(/Main is protected/)).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Commit changes'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Create file'})).not.toBeInTheDocument()
    expect(commits.create).not.toHaveBeenCalled()
  })
  it('requires deliberate discard before replacing an unsaved file',async()=>{
    setup();await screen.findByLabelText('Group file source')
    fireEvent.change(screen.getByLabelText('New file path'),{target:{value:'src/Main.java'}})
    fireEvent.click(screen.getByRole('button',{name:'Create file'}))
    expect(await screen.findByRole('dialog',{name:'Discard changes?'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
    expect(screen.getByLabelText('Group file source')).toHaveValue('# Project task\n')
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })
  it('keeps source after a failed job and does not report a fabricated commit',async()=>{
    const pending={jobId:'job',repositoryId:'repo',filePath:'README.md',branchName:'main',status:'FAILED',commitHash:null}
    setup({commits:{get:vi.fn().mockResolvedValue({data:pending})}})
    const source=await screen.findByLabelText('Group file source')
    fireEvent.change(source,{target:{value:'Keep these edits'}});fireEvent.change(screen.getByLabelText('Commit message'),{target:{value:'Save changes'}})
    fireEvent.click(screen.getByRole('button',{name:'Commit changes'}))
    expect(await screen.findByText(/The commit was not applied/)).toBeInTheDocument()
    expect(source).toHaveValue('Keep these edits');expect(screen.queryByText(/Committed /)).not.toBeInTheDocument()
  })
  it('keeps an ambiguous request frozen and retries the identical payload and key',async()=>{
    const create=vi.fn().mockRejectedValueOnce(new ApiError({code:'NETWORK_ERROR',message:'offline'})).mockResolvedValue({data:{jobId:'job',repositoryId:'repo',filePath:'README.md',branchName:'main',status:'PENDING',commitHash:null}})
    setup({commits:{create}})
    const source=await screen.findByLabelText('Group file source')
    fireEvent.change(screen.getByLabelText('Commit message'),{target:{value:'Initial commit'}});fireEvent.click(screen.getByRole('button',{name:'Commit changes'}))
    fireEvent.click(await screen.findByRole('button',{name:'Retry same commit request'}))
    await screen.findByText(/Committed bbbbbbbb/)
    expect(create).toHaveBeenCalledTimes(2);expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);expect(source).toHaveValue('# Project task\n')
  })
  it('preserves edits on a stale branch until the Student reviews and explicitly adopts a newer base',async()=>{
    const branches=[{branchName:'main',isDefault:true,commitId:hash,authorName:'Student',authoredAt:'2026-10-23T00:00:00Z',subject:'Initial'}]
    const {gitApi,commits,pending}=setup({branches})
    fireEvent.click(await screen.findByRole('button',{name:'README.md'}))
    const source=await screen.findByLabelText('Group file source');fireEvent.change(source,{target:{value:'My edits'}})
    fireEvent.change(screen.getByLabelText('Commit message'),{target:{value:'Update README'}})
    commits.get.mockResolvedValue({data:{...pending,status:'CONFLICTED',failureCode:'BROWSER_HEAD_CHANGED'}})
    fireEvent.click(screen.getByRole('button',{name:'Commit changes'}))
    expect(await screen.findByRole('button',{name:'Compare latest'})).toBeInTheDocument();expect(source).toHaveValue('My edits')
    expect(screen.getByRole('button',{name:'Commit changes'})).toBeDisabled()
    gitApi.listBranches.mockResolvedValue({data:[{...branches[0],commitId:second}]})
    fireEvent.click(screen.getByRole('button',{name:'Compare latest'}))
    fireEvent.click(await screen.findByRole('button',{name:'Keep edits on latest base'}))
    fireEvent.click(await screen.findByRole('button',{name:'Confirm'}))
    expect(source).toHaveValue('My edits')
    await waitFor(()=>expect(screen.getByRole('button',{name:'Commit changes'})).toBeEnabled())
    expect(commits.create).toHaveBeenCalledTimes(1)
  })
})
