import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { classHref } from '../classes/class-links.js'
import { formatProjectDate } from '../projects/project-projections.js'
import { groupContextProjection, formatRepositoryLabel } from './repository-projections.js'
import { repositoryContentApi } from './repository-content-api.js'
import { branchProjection, fileProjection, repositoryGitSummaryProjection, treeProjection } from './repository-content-projections.js'
import { FilesView, HistoryView, BranchesView } from './RepositoryGitViews.jsx'
import { RepositoryCollaborationPanel, RepositoryLifecyclePanel } from './RepositoryCollaborationViews.jsx'
import { RepositoryActivityPanel } from './RepositoryActivityPanel.jsx'
import { GroupCodeMenu } from './GroupCodeMenu.jsx'
import './group-repository.css'

function Readme({ repositoryId, branch, api }) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setResult(null)
      try {
        const tree = treeProjection((await api.getTree(repositoryId, { commitId: branch.commitId, path: '' }, { signal: controller.signal })).data)
        const entry = tree.entries.find((item) => item.entryType === 'blob' && /^readme(?:\.(?:md|txt))?$/i.test(item.name))
        if (!entry) return
        const file = fileProjection((await api.getFile(repositoryId, { commitId: branch.commitId, path: entry.path }, { signal: controller.signal })).data)
        if (file.path !== entry.path || file.commitId !== branch.commitId) throw new Error('README identity mismatch.')
        if (!controller.signal.aborted) setResult(file)
      } catch (error) { if (!controller.signal.aborted && error?.name !== 'AbortError') setResult({ unavailable: true }) }
    })
    return () => controller.abort()
  }, [api, branch.commitId, repositoryId])
  if (!result) return null
  return <section className="group-readme"><h2>README</h2>{result.unavailable ? <p>README preview unavailable or exceeds the safe text limit.</p> : <><small>{result.path} · Plain text preview</small><pre>{result.content}</pre></>}</section>
}

export function GroupRepositoryView({ repository, project, role, api, classApi, gitApi = repositoryContentApi, onReload }) {
  const capabilities = useCapabilities()
  const [contextState, setContextState] = useState({ status: 'loading' })
  const [source, setSource] = useState({ status: 'idle', summary: null, branches: [] })
  const [tab, setTab] = useState('code')
  const [branchName, setBranchName] = useState(repository.defaultBranch)
  const [version, setVersion] = useState(0)
  const [authorityVersion, setAuthorityVersion] = useState(0)
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setContextState((current) => current.status === 'ready' ? current : { status: 'loading' })
      try {
        const context = groupContextProjection((await api.getGroupContext(repository.id, { signal: controller.signal })).data, repository)
        if (!controller.signal.aborted) setContextState((current) => current.status === 'ready' && JSON.stringify(current.context) === JSON.stringify(context) ? current : { status: 'ready', context })
      } catch (error) { if (!controller.signal.aborted) setContextState({ status: 'error', error }) }
    })
    return () => controller.abort()
  }, [api, repository, version, authorityVersion])
  useEffect(() => {
    // Refresh deadline/membership capabilities without assuming a credential is authority.
    const refreshAuthority = () => setAuthorityVersion((value) => value + 1)
    const timer = setInterval(refreshAuthority, 30_000)
    window.addEventListener('focus', refreshAuthority)
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshAuthority) }
  }, [])
  const context = contextState.status === 'ready' ? contextState.context : null
  useEffect(() => {
    if (!context?.permissions.canRead || !capabilities.git.inspection) return undefined
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setSource({ status: 'loading', summary: null, branches: [] })
      try {
        const summary = repositoryGitSummaryProjection((await gitApi.getSummary(repository.id, { signal: controller.signal })).data, repository)
        const branches = summary.empty ? [] : (await gitApi.listBranches(repository.id, { signal: controller.signal })).data.map(branchProjection)
        if (!controller.signal.aborted) {
          setSource({ status: 'ready', summary, branches })
          setBranchName((current) => branches.some((branch) => branch.branchName === current) ? current : summary.defaultBranch)
        }
      } catch (error) { if (!controller.signal.aborted) setSource({ status: 'error', summary: null, branches: [], error }) }
    })
    return () => controller.abort()
  }, [capabilities.git.inspection, context, gitApi, repository])
  if (contextState.status === 'loading') return <RequestState kind="loading" message="Loading Group Repository permissions." />
  if (!context) return <RequestState kind="unavailable" error={contextState.error} action={<button type="button" onClick={refresh}>Retry group access</button>} />
  const owner = context.currentRole === 'MAINTAINER'
  const metadataOnly = context.currentRole === 'METADATA_ONLY'
  const branch = source.branches.find((item) => item.branchName === branchName)
  const updated = () => { onReload(); refresh() }
  return <main className="group-repository-page">
    <NavLink className="student-back-link" to={classHref(`/${role}/projects/${context.project.id}`, context.class.id)}>← Back to Group Project</NavLink>
    <header className="group-repository-header"><div><p>Group Project · {context.class.className} · {context.team.name}</p><h1>{context.project.title}</h1><p>{repository.repositoryName}{repository.description ? ` · ${repository.description}` : ''}</p></div>
      <div className="group-state"><span>{formatRepositoryLabel(repository.status)}</span><span>{formatRepositoryLabel(repository.reviewStatus)}</span><small>{context.permissions.canWrite ? 'Repository writable' : 'Repository read-only'} · {formatRepositoryLabel(repository.storageStatus)}</small></div>
      <dl><div><dt>Due</dt><dd>{formatProjectDate(context.project.dueDate)}</dd></div><div><dt>Maintainer</dt><dd>{repository.owner.fullName}</dd></div><div><dt>Members</dt><dd>{context.team.activeMemberCount}</dd></div><div><dt>Instructor oversight</dt><dd>{context.teachingStaff.map((person) => `${person.fullName}${person.role === 'CO_INSTRUCTOR' ? ' (Co-Instructor)' : ''}`).join(', ') || 'No current teaching staff'}</dd></div></dl>
    </header>
    <div className="group-repository-actions"><div className="group-tabs" role="tablist" aria-label="Group repository views" onKeyDown={(event) => {
      const buttons = [...event.currentTarget.querySelectorAll('[role=tab]')]
      const index = buttons.indexOf(event.target)
      if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next].focus(); buttons[next].click()
    }}>{['code', 'commits', 'branches', 'members', 'activity'].map((id) => <button type="button" role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}</div><button type="button" className="student-outline-action" onClick={updated}>Refresh repository</button><GroupCodeMenu key={`${repository.id}:${version}:${repository.updatedAt}:${JSON.stringify(context.permissions)}`} repository={repository} context={context} api={api} gitApi={gitApi} available={capabilities.git.smartHttp} /></div>
    {metadataOnly ? <RequestState kind="unavailable" compact title="Class-visible project metadata" message="This is another group's repository. Class metadata visibility does not grant member-only source, credentials or activity access." /> : <>
      {['code', 'commits', 'branches'].includes(tab) && (!capabilities.git.inspection || !context.permissions.canRead) && <RequestState kind="unavailable" compact title="Source inspection unavailable" message="Storage may still be provisioning, or current source permissions do not allow inspection." />}
      {context.permissions.canRead && capabilities.git.inspection && ['code', 'commits', 'branches'].includes(tab) && <section className="group-source" aria-label={`${tab} view`}>
        {source.status === 'loading' && <RequestState kind="loading" compact message="Loading live Git source." />}{source.status === 'error' && <RequestState kind="unavailable" compact error={source.error} />}
        {source.status === 'ready' && (source.summary.empty ? <section className="repository-empty-guidance"><h2>No commits yet</h2><p>{owner ? 'Initialize main from your local Git client using Code above.' : 'Your Maintainer must establish main before shared feature work begins.'}</p>{owner && <pre>{'git checkout -b main\n# create your project files\ngit add .\ngit commit -m "Initial project"\ngit push -u origin main'}</pre>}</section> : <>
          {tab === 'code' && <>{branch && <div className="group-latest-commit"><strong>{branch.subject}</strong><span>{branch.authorName} · claimed Git author · {formatProjectDate(branch.authoredAt)} · <code>{branch.commitId.slice(0, 8)}</code></span></div>}<FilesView key={`${branchName}:${version}`} api={gitApi} repositoryId={repository.id} summary={source.summary} branches={source.branches} selectedBranch={branchName} onSelectBranch={setBranchName} />{branch && <Readme repositoryId={repository.id} branch={branch} api={gitApi} />}</>}
          {tab === 'commits' && <HistoryView key={`${branchName}:${version}`} api={gitApi} repositoryId={repository.id} summary={source.summary} branches={source.branches} selectedBranch={branchName} onSelectBranch={setBranchName} />}
          {tab === 'branches' && <><p>Main is protected: only the Maintainer may integrate normal fast-forward updates. No force pushes or main deletion.</p><BranchesView group summary={source.summary} branches={source.branches} /><p>Developers push feature branches. The Maintainer fetches and merges locally, then pushes main. There is no browser merge.</p></>}
        </>)}
      </section>}
      {tab === 'members' && <><p>Instructor oversight is read-only for Git. Group access follows synchronized academic Team membership.</p><RepositoryCollaborationPanel key={`${repository.id}:${version}`} role={role} owner={owner} repository={repository} project={project} permissions={context.permissions} api={api} classApi={classApi} onRepositoryChange={updated} onReloadRepository={updated} /><RepositoryLifecyclePanel permissions={context.permissions} role={role} owner={owner} repository={repository} api={api} onRepositoryChange={updated} onReloadRepository={updated} /></>}
      {tab === 'activity' && context.permissions.canViewActivity && <RepositoryActivityPanel key={`${repository.id}:${version}`} repositoryId={repository.id} api={api} />}
    </>}
  </main>
}
