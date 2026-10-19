import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GroupFileBrowser } from './GroupFileBrowser.jsx'
import { ApiError } from '../api/api-client.js'
import { collectGroupFiles } from './group-file-search.js'

const commitId = 'a'.repeat(40)
const entry = (name, path, entryType = 'blob') => ({ name, path, entryType, objectId: 'b'.repeat(40), sizeBytes: entryType === 'tree' ? null : 40 })
const folder = (path, entries, id = commitId) => ({ data: { commitId: id, path, entries } })
const file = (path, content, id = commitId) => ({ data: { commitId: id, path, content, encoding: 'utf-8', sizeBytes: 40 } })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
function view(api, id = commitId) { return <GroupFileBrowser key={id} repositoryId="repository" commitId={id} api={api} onRootChange={vi.fn()} /> }
function searchFor(query) {
  fireEvent.change(screen.getByLabelText('Search files'), { target: { value: query } })
  fireEvent.submit(screen.getByRole('search', { name: 'Search repository files' }))
}
async function exact(path) {
  searchFor(path)
  fireEvent.click(await screen.findByRole('option', { name: path }))
}

describe('Group compact file browser', () => {
  it('browses folders and clickable breadcrumbs and pins all reads to the visible commit', async () => {
    const api = { getTree: vi.fn((_id, query) => Promise.resolve(query.path ? folder('src', [entry('Main.java', 'src/Main.java')]) : folder('', [entry('src', 'src', 'tree')]))), getFile: vi.fn().mockResolvedValue(file('src/Main.java', 'class Main {}')) }
    const user = userEvent.setup()
    render(view(api))
    await user.click(await screen.findByRole('button', { name: 'Folder src' }))
    await user.click(await screen.findByRole('button', { name: 'File Main.java' }))
    expect(await screen.findByText('class Main {}')).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('repository', { commitId, path: 'src/Main.java' }, expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'src', exact: true }))
    expect(await screen.findByRole('button', { name: 'File Main.java' })).toBeInTheDocument()
    expect(screen.queryByText('class Main {}')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Files', exact: true }))
    expect(await screen.findByRole('button', { name: 'Folder src' })).toBeInTheDocument()
    expect(api.getTree.mock.calls.every(([, query]) => query.commitId === commitId && !query.branchName)).toBe(true)
  })

  it('separates exact-path opening from filename search without inventing editing', async () => {
    const api = { getTree: vi.fn((_id, query) => Promise.resolve(query.path ? folder('src', [entry('Main.java', 'src/Main.java')]) : folder('', [entry('src', 'src', 'tree')]))), getFile: vi.fn().mockResolvedValue(file('src/Main.java', '<script>unsafe()</script>')) }
    const user = userEvent.setup()
    render(view(api))
    await exact('src/Main.java')
    expect(await screen.findByText('<script>unsafe()</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.queryByRole('button', { name: /Add File|Edit|Merge/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to folder' }))
    expect(api.getTree).toHaveBeenLastCalledWith('repository', { commitId, path: 'src' }, expect.any(Object))
  })

  it('ignores a late file after folder navigation even when the mock ignores abort', async () => {
    const late = deferred()
    const api = { getTree: vi.fn().mockResolvedValue(folder('', [entry('Old.java', 'Old.java')])), getFile: vi.fn().mockReturnValue(late.promise) }
    render(view(api))
    fireEvent.click(await screen.findByRole('button', { name: 'File Old.java' }))
    fireEvent.click(screen.getByRole('button', { name: 'Files', exact: true }))
    await act(async () => late.resolve(file('Old.java', 'obsolete preview')))
    expect(screen.queryByText('obsolete preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'File Old.java' })).toBeInTheDocument()
  })

  it('rejects mismatched snapshots and ignores the old branch response after remount', async () => {
    const late = deferred()
    const next = 'c'.repeat(40)
    const api = { getTree: vi.fn().mockReturnValueOnce(late.promise).mockResolvedValue(folder('', [entry('Main.java', 'Main.java')], next)), getFile: vi.fn().mockResolvedValue(file('Main.java', 'wrong snapshot', commitId)) }
    const rendered = render(view(api))
    rendered.rerender(view(api, next))
    await act(async () => late.resolve(folder('', [entry('Old.java', 'Old.java')])))
    expect(screen.queryByRole('button', { name: 'File Old.java' })).not.toBeInTheDocument()
    await exact('Main.java')
    await waitFor(() => expect(screen.getByText('File preview unavailable')).toBeInTheDocument())
    expect(screen.queryByText('wrong snapshot')).not.toBeInTheDocument()
  })

  it('finds partial case-insensitive filenames across folders and only opens an actual selected match', async () => {
    const api = { getTree: vi.fn((_id, query) => Promise.resolve(query.path ? folder('src', [entry('Main.java', 'src/Main.java')]) : folder('', [entry('src', 'src', 'tree')]))), getFile: vi.fn().mockResolvedValue(file('src/Main.java', 'class Main {}')) }
    render(view(api))
    await screen.findByRole('button', { name: 'Folder src' })
    searchFor('main')
    const match = await screen.findByRole('option', { name: 'src/Main.java' })
    expect(api.getFile).not.toHaveBeenCalled()
    fireEvent.click(match)
    expect(await screen.findByText('class Main {}')).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('repository', { commitId, path: 'src/Main.java' }, expect.any(Object))
    const calls = api.getTree.mock.calls.length
    searchFor('nothing')
    expect(await screen.findByText('No matching files.')).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledTimes(calls)
    expect(screen.getByText('class Main {}')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByLabelText('Search files')).toHaveValue('')
  })

  it('keeps empty matches out of the file API and leaves the current directory intact', async () => {
    const api = { getTree: vi.fn((_id, query) => Promise.resolve(query.path ? folder('src', [entry('Main.java', 'src/Main.java')]) : folder('', [entry('src', 'src', 'tree')]))), getFile: vi.fn() }
    render(view(api))
    fireEvent.click(await screen.findByRole('button', { name: 'Folder src' }))
    await screen.findByRole('button', { name: 'File Main.java' })
    searchFor('missing')
    expect(await screen.findByText('No matching files.')).toBeInTheDocument()
    expect(api.getFile).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'File Main.java' })).toBeInTheDocument()
  })

  it('recovers a missing file inline, retries the same snapshot, then returns to its actual folder', async () => {
    const api = { getTree: vi.fn((_id, query) => Promise.resolve(query.path ? folder('src', [entry('Missing.java', 'src/Missing.java')]) : folder('', [entry('src', 'src', 'tree')]))), getFile: vi.fn().mockRejectedValueOnce(new ApiError({ status: 404, message: 'internal', requestId: 'private-ref' })).mockResolvedValue(file('src/Missing.java', 'recovered')) }
    render(view(api))
    await exact('src/Missing.java')
    expect(await screen.findByRole('heading', { name: 'We couldn’t find that file.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search files')).toHaveValue('src/Missing.java')
    expect(screen.queryByRole('link', { name: 'Back to Projex' })).not.toBeInTheDocument()
    expect(screen.queryByText(/404|private-ref|internal/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry file' }))
    expect(await screen.findByText('recovered')).toBeInTheDocument()
    expect(api.getFile.mock.calls.every(([, query]) => query.path === 'src/Missing.java' && query.commitId === commitId)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Back to folder' }))
    await waitFor(() => expect(api.getTree).toHaveBeenLastCalledWith('repository', { commitId, path: 'src' }, expect.any(Object)))
  })

  it('retains the query on search failure, retries reads, and reveals no private matches on denial', async () => {
    const api = { getTree: vi.fn().mockResolvedValueOnce(folder('', [])).mockRejectedValueOnce(new ApiError({ status: 403, message: 'secret names', requestId: 'hidden' })).mockResolvedValue(folder('', [entry('Main.java', 'Main.java')])) }
    render(view(api))
    await screen.findByText('This folder is empty.')
    searchFor('main')
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument()
    expect(screen.getByLabelText('Search files')).toHaveValue('main')
    expect(screen.queryByText(/secret names|hidden|403/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry search' }))
    expect(await screen.findByRole('option', { name: 'Main.java' })).toBeInTheDocument()
  })

  it('bounds discovery and never claims complete negative results for a partial index', async () => {
    const api = { getTree: vi.fn().mockResolvedValue(folder('', [entry('src', 'src', 'tree')])) }
    const result = await collectGroupFiles({ api, repositoryId: 'repository', commitId, signal: new AbortController().signal, maxFolders: 1 })
    expect(result).toEqual({ files: [], complete: false })
    expect(api.getTree).toHaveBeenCalledOnce()
  })

  it('does not clear newer search text when a file request completes later', async () => {
    const late = deferred()
    const api = { getTree: vi.fn().mockResolvedValue(folder('', [entry('Main.java', 'Main.java')])), getFile: vi.fn().mockReturnValue(late.promise) }
    render(view(api))
    searchFor('main')
    fireEvent.click(await screen.findByRole('option', { name: 'Main.java' }))
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'new unfinished query' } })
    await act(async () => late.resolve(file('Main.java', 'class Main {}')))
    expect(screen.getByLabelText('Search files')).toHaveValue('new unfinished query')
  })

  it('discards late search results after clearing and after branch snapshot changes', async () => {
    const late = deferred()
    const api = { getTree: vi.fn().mockResolvedValueOnce(folder('', [])).mockReturnValueOnce(late.promise).mockResolvedValue(folder('', [], 'c'.repeat(40))), getFile: vi.fn() }
    const rendered = render(view(api))
    await screen.findByText('This folder is empty.')
    searchFor('private')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    rendered.rerender(view(api, 'c'.repeat(40)))
    await act(async () => late.resolve(folder('', [entry('private.java', 'private.java')])))
    expect(screen.queryByText('private.java')).not.toBeInTheDocument()
    expect(api.getFile).not.toHaveBeenCalled()
  })
})
