import { useId, useState } from 'react'
import { formatProjectDate } from '../projects/project-projections.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { GroupCommitCount } from './GroupCommitCount.jsx'

export function GroupLatestCommit({ branch, repositoryId, api, refreshVersion, onOpenCommit, onOpenHistory }) {
  const previewId = useId()
  const [preview, setPreview] = useState(false)
  const initials = branch.authorName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || 'G'
  const identityHelp = 'Git identity is supplied by the commit author, not verified by Projex.'
  return <div className="group-latest-commit">
    <button type="button" className="group-latest-author" onClick={() => onOpenCommit(branch.commitId)} title={identityHelp} aria-label={`View commit by ${branch.authorName}`}><span className="group-git-avatar" aria-hidden="true">{initials}</span><strong>{branch.authorName}</strong></button>
    <div className="group-commit-summary" onMouseEnter={() => setPreview(true)} onMouseLeave={() => setPreview(false)} onFocus={() => setPreview(true)} onBlur={() => setPreview(false)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPreview(false) } }}><button type="button" className="group-latest-subject" aria-describedby={preview ? previewId : undefined} onClick={() => onOpenCommit(branch.commitId)}>{branch.subject || 'Untitled commit'}</button>
      {preview && <div className="group-commit-hovercard" id={previewId} role="tooltip"><ProjexIcon name="commit" size={18} /><strong>{branch.subject || 'Untitled commit'}</strong><p title={identityHelp}>{branch.authorName} · {formatProjectDate(branch.authoredAt)}</p><code>{branch.commitId.slice(0, 8)}</code><small>Open commit details</small></div>}
    </div>
    <div className="group-latest-meta"><button type="button" className="group-latest-hash" onClick={() => onOpenCommit(branch.commitId)} aria-label={`View commit ${branch.commitId.slice(0, 8)}`}><code>{branch.commitId.slice(0, 8)}</code></button><time dateTime={branch.authoredAt}>{formatProjectDate(branch.authoredAt)}</time><GroupCommitCount {...{ api, repositoryId, branch, refreshVersion }} onOpen={onOpenHistory} /></div>
  </div>
}
