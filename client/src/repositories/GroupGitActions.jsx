import { useCallback, useEffect, useRef, useState } from 'react'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import { groupBrowserRefApi } from './group-browser-ref-api.js'

const pending = job => ['PENDING','RUNNING'].includes(job?.status)
const hash = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value)
const friendly = failure => ({
  BROWSER_REF_CHANGED:'A branch changed. Review the latest branches and confirm again. Your editor draft is kept.',
  BROWSER_BRANCH_EXISTS:'That branch already exists or conflicts with another branch name. Choose a different name.',
  BROWSER_BRANCH_DIVERGED:'These branches have diverged. Use your local Git client to resolve the merge.',
  BROWSER_ALREADY_UP_TO_DATE:'The target already has this revision. Nothing needs to be merged.',
  BROWSER_ACCESS_REVOKED:'Your editing access changed, or the project is now read-only. Your draft is kept.',
  BROWSER_WRITE_DENIED:'You do not have permission to update this target branch.',
  BROWSER_BRANCH_LIMIT:'This repository has reached its branch limit. Ask your instructor for help.',
  VALIDATION_FAILED:'Use a valid branch name such as feature/greeting. Reserved names and spaces are not supported.',
}[failure?.failureCode || failure?.code] || 'This Git action could not be completed. Your editor draft is kept. Review the branches and try again.')

function MergeIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 7v10M18 7c0 6-12 3-12 10" /></svg>
}
export default function GroupGitActions({ repositoryId, branchName, head, branches, canWrite, canUpdateMain, disabled, dirty, commitAction, onCreated, onMerged, onBusyChange, onRefreshBranches, api = groupBrowserRefApi, pollingOptions }) {
  const [view,setView]=useState(null), [name,setName]=useState(''), [source,setSource]=useState(branchName), [target,setTarget]=useState('')
  const [preview,setPreview]=useState(null), [error,setError]=useState(''), [job,setJob]=useState(null), [busy,setBusy]=useState(false)
  const [uncertain,setUncertain]=useState(false), [bounded,setBounded]=useState(false), [notice,setNotice]=useState('')
  const request=useRef(null), fence=useRef(0), lock=useRef(false)
  useEffect(()=>{ const ticket=fence; return()=>{ticket.current++} },[repositoryId])
  const running=busy||pending(job)||uncertain
  const writable=branches.filter(branch=>canWrite&&(branch.branchName.toLowerCase()!=='main'||canUpdateMain))
  const adopt=useCallback(response=>{
    const value=response.data, input=request.current?.input
    if(!input||!value?.jobId||value.repositoryId!==repositoryId||value.jobId!==request.current.jobId||value.operation!==input.operation||value.sourceBranchName!==input.sourceBranchName||value.targetBranchName!==input.targetBranchName) throw new Error('Unconfirmed Git result')
    if(!['PENDING','RUNNING','SUCCEEDED','FAILED','CONFLICTED'].includes(value.status)) throw new Error('Unconfirmed Git state')
    setJob(value)
    if(value.status==='SUCCEEDED') {
      if(!hash(value.commitHash)||value.commitHash!==input.expectedSourceCommitHash) throw new Error('Unconfirmed Git result')
      setNotice(input.operation==='CREATE_BRANCH'?'Created '+input.targetBranchName+'. Your unsaved edits stay with you.':'Merged '+input.sourceBranchName+' into '+input.targetBranchName+'.')
      if(input.operation==='CREATE_BRANCH') onCreated(value)
      else onMerged(value)
      request.current=null;setView(null);setUncertain(false);onBusyChange(false)
    } else if(['FAILED','CONFLICTED'].includes(value.status)) {
      setError(friendly(value));setUncertain(false);request.current=null;onBusyChange(false)
    }
    return pending(value)
  },[repositoryId,onCreated,onMerged,onBusyChange])
  const poll=useCallback((id,options)=>api.get(repositoryId,id,options),[api,repositoryId])
  const pollError=useCallback(()=>{setError('We could not confirm this Git action. Check its status before starting another.');setBounded(true)},[])
  const stop=useCallback(()=>setBounded(true),[])
  useBoundedPolling({identity:job?.jobId,active:pending(job)&&!bounded,load:poll,onData:adopt,onError:pollError,onBoundedStop:stop,maximumDurationMs:60000,...pollingOptions})
  const open=kind=>{
    setView(kind);setError('');setPreview(null);setJob(null);setNotice('');setName('')
    const defaultTarget=writable.find(branch=>branch.branchName==='main')?.branchName||writable.find(branch=>branch.branchName!==branchName)?.branchName||''
    setTarget(defaultTarget);setSource(branchName===defaultTarget?branches.find(branch=>branch.branchName!==defaultTarget)?.branchName||'':branchName)
  }
  const review=async()=>{
    if(lock.current)return
    lock.current=true;const ticket=fence.current;setBusy(true);setError('');setPreview(null)
    try {
      const value=(await api.preview(repositoryId,source,target)).data
      if(ticket!==fence.current)return
      if(value?.repositoryId!==repositoryId||value.sourceBranchName!==source||value.targetBranchName!==target||!hash(value.sourceCommitHash)||!hash(value.targetCommitHash)||typeof value.fastForward!=='boolean'||typeof value.upToDate!=='boolean'||!Number.isSafeInteger(value.commitCount)||!Array.isArray(value.files)||!Array.isArray(value.commits)) throw new Error('Unconfirmed preview')
      setPreview(value)
    } catch(failure){if(ticket===fence.current)setError(friendly(failure))}
    finally{lock.current=false;if(ticket===fence.current)setBusy(false)}
  }
  const submit=async event=>{
    event?.preventDefault();event?.stopPropagation()
    if(lock.current||pending(job))return
    if(!request.current) {
      const input=view==='CREATE_BRANCH'?{operation:view,sourceBranchName:branchName,targetBranchName:name,expectedSourceCommitHash:head,expectedTargetCommitHash:null}:{operation:view,sourceBranchName:source,targetBranchName:target,expectedSourceCommitHash:preview?.sourceCommitHash,expectedTargetCommitHash:preview?.targetCommitHash}
      request.current={input,key:'group-ref:'+crypto.randomUUID()}
    }
    lock.current=true;const ticket=fence.current;setBusy(true);setError('');onBusyChange(true)
    try {
      const response=await api.create(repositoryId,request.current.input,request.current.key)
      if(ticket!==fence.current)return
      if(!response.data?.jobId)throw new Error('Unconfirmed action')
      request.current.jobId=response.data.jobId;setUncertain(false);setBounded(false);adopt(response)
    } catch(failure) {
      if(ticket===fence.current) {
        if(failure.status&&failure.status<500){request.current=null;setUncertain(false);onBusyChange(false);setError(friendly(failure))}
        else {setUncertain(true);setError('The result is not confirmed. Retry the same action to recover its status. Your draft is kept.')}
      }
    } finally {lock.current=false;if(ticket===fence.current)setBusy(false)}
  }
  const refresh=async()=>{
    setBusy(true);setError('');setPreview(null);setJob(null)
    try{await onRefreshBranches()}catch{setError('Could not refresh branches. Try again; your draft is kept.')}finally{setBusy(false)}
  }
  const clearMerge=setter=>event=>{setter(event.target.value);setPreview(null);setError('');setJob(null)}
  const close=()=>{if(!running){setView(null);setError('');setPreview(null)}}
  return <div className="group-editor-git-actions">
    <button type="button" className="student-outline-action" disabled={disabled||!canWrite||!head} onClick={()=>open('CREATE_BRANCH')}><ProjexIcon name="branch" size={17} />New Branch</button>
    {commitAction}
    <button type="button" className="student-outline-action" disabled={disabled||!canWrite||branches.length<2} onClick={()=>open('FAST_FORWARD')}><MergeIcon />Merge Branch</button>
    {notice&&<p className="group-editor-ref-notice" role="status">{notice}</p>}
    {view&&<AppDialog title={view==='CREATE_BRANCH'?'New branch':'Merge branch'} className="group-editor-dialog group-editor-ref-dialog" busy={running} onClose={close}>
      {view==='CREATE_BRANCH'?<form onSubmit={submit}><p>Create a branch from <strong>{branchName}</strong> at <code>{head?.slice(0,8)}</code>.</p><label>New branch name<input value={name} onChange={event=>setName(event.target.value)} disabled={running} maxLength={200} placeholder="feature/greeting" autoComplete="off" /></label>{dirty&&<p className="group-editor-help-hint">Your unsaved edits will move to the new branch. They are saved to Git only when you commit.</p>}</form>:<>
        <p>Bring changes from one branch into another with a fast-forward merge.</p>
        <label>Source branch<select value={source} onChange={clearMerge(setSource)} disabled={running}>{branches.map(branch=><option key={branch.branchName}>{branch.branchName}</option>)}</select></label>
        <label>Target branch<select value={target} onChange={clearMerge(setTarget)} disabled={running}><option value="">Choose a target</option>{writable.map(branch=><option key={branch.branchName} value={branch.branchName}>{branch.branchName}</option>)}</select></label>
        {!canUpdateMain&&<p className="group-editor-help-hint">Main is protected. A Maintainer must merge changes into main.</p>}
        {!preview&&<button type="button" className="student-outline-action" disabled={running||!source||!target||source===target} onClick={review}>Review merge</button>}
        {preview&&<section className="group-editor-merge-summary"><strong>{preview.sourceBranchName} → {preview.targetBranchName}</strong><p>{preview.sourceCommitHash.slice(0,8)} → target currently {preview.targetCommitHash.slice(0,8)}</p>{preview.upToDate?<p>Already up to date.</p>:!preview.fastForward?<p>These branches have diverged. Use your local Git client to resolve the merge.</p>:<><p>{preview.commitCount} commit{preview.commitCount===1?'':'s'} · {preview.files.length} changed file{preview.files.length===1?'':'s'}. Only {target} will advance; no merge commit is created.</p><ul>{preview.commits.map(commit=><li key={commit.commitId}>{commit.subject}</li>)}</ul><details><summary>Changed files</summary><ul>{preview.files.map(file=><li key={file}>{file}</li>)}</ul></details></>}</section>}
      </>}
      {error&&<p role="alert">{error}</p>}
      {pending(job)&&<p role="status">{bounded?'Still waiting for confirmation. Check this action before starting another.':'Applying Git action…'}</p>}
      {job&&['FAILED','CONFLICTED'].includes(job.status)&&<button type="button" className="student-outline-action" disabled={busy} onClick={refresh}>Review latest branches</button>}
      <footer>{!running&&<button type="button" className="student-outline-action" onClick={close}>Cancel</button>}
        {pending(job)?<button type="button" className="student-outline-action" disabled={busy} onClick={async()=>{setBusy(true);try{adopt(await api.get(repositoryId,job.jobId));setBounded(false)}catch{pollError()}finally{setBusy(false)}}}>Check action status</button>:
        <button type="button" className="student-primary-action" disabled={busy||!uncertain&&(view==='CREATE_BRANCH'?!name.trim()||job?.status==='CONFLICTED':!preview?.fastForward||preview?.upToDate||job?.status==='CONFLICTED')} onClick={submit}>{busy?'Please wait…':uncertain?'Retry same action':view==='CREATE_BRANCH'?'Create branch':'Confirm merge'}</button>}
      </footer>
    </AppDialog>}
  </div>
}
