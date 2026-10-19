import { useEffect, useState } from 'react'
import { ProjexIcon } from '../design/ProjexIcon.jsx'

// Summary counts all branch tips. Only history's totalItems is branch-specific.
export function GroupCommitCount({ api, repositoryId, branch, refreshVersion, onOpen }) {
  const [result, setResult] = useState(null)
  const identity = `${repositoryId}:${branch.branchName}:${branch.commitId}:${refreshVersion}`
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      try {
        const response = await api.listCommits(repositoryId, { branchName: branch.branchName, page: 1, limit: 1 }, { signal: controller.signal })
        const total = response.pagination?.totalItems
        // A moving branch may change between the branch list and history read.
        // Do not label an old snapshot with the new tip's count.
        if (!Number.isSafeInteger(total) || total < 1 || response.data?.[0]?.commitId !== branch.commitId) throw new Error('History changed')
        if (!controller.signal.aborted) setResult({ identity, total })
      } catch { if (!controller.signal.aborted) setResult({ identity, total: null }) }
    })
    return () => controller.abort()
  }, [api, repositoryId, branch.branchName, branch.commitId, identity])
  const total = result?.identity === identity ? result.total : null
  return <button type="button" className="group-commit-count" onClick={onOpen} title={`View ${branch.branchName} commit history`}><ProjexIcon name="commit" size={16} />{total === null ? 'Commits' : `${new Intl.NumberFormat().format(total)} ${total === 1 ? 'Commit' : 'Commits'}`}</button>
}
