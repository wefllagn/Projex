import { useEffect, useState } from 'react'
import { fileProjection, treeProjection } from './repository-content-projections.js'

export function RepositoryReadme({ repositoryId, branch, api }) {
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
