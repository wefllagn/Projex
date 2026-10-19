import { treeProjection } from './repository-content-projections.js'

// A bounded, explicit search of an immutable snapshot using existing authorized
// immediate-tree reads. No source content is read or persisted by the finder.
export async function collectGroupFiles({ api, repositoryId, commitId, signal, maxFolders = 64, maxEntries = 5000 }) {
  const pending = ['']
  const visited = new Set()
  const files = []
  let entries = 0
  while (pending.length && visited.size < maxFolders) {
    signal.throwIfAborted()
    const path = pending.shift()
    if (visited.has(path)) continue
    visited.add(path)
    const tree = treeProjection((await api.getTree(repositoryId, { commitId, path }, { signal })).data)
    signal.throwIfAborted()
    if (tree.commitId !== commitId || tree.path !== path) throw new Error('Snapshot mismatch')
    for (const entry of tree.entries) {
      // Fail closed on responses that do not belong to this directory.
      if (entry.path !== (path ? `${path}/${entry.name}` : entry.name) || entry.name.includes('/')) throw new Error('Folder mismatch')
      if (++entries > maxEntries) return { files, complete: false }
      if (entry.entryType === 'blob') files.push(entry.path)
      else if (!visited.has(entry.path)) pending.push(entry.path)
    }
  }
  return { files: files.sort(), complete: pending.length === 0 }
}

export function matchGroupFiles(files, query) {
  const term = query.trim().toLocaleLowerCase()
  const rank = (path) => {
    const normalized = path.toLocaleLowerCase(), name = normalized.split('/').at(-1)
    return normalized === term || name === term ? 0 : name.startsWith(term) ? 1 : 2
  }
  return term ? files.filter((path) => path.toLocaleLowerCase().includes(term))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)) : []
}
