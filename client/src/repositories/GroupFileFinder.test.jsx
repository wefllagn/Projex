import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GroupFileFinder } from './GroupFileFinder.jsx'
import { matchGroupFiles } from './group-file-search.js'
import { ApiError } from '../api/api-client.js'

const commitId = 'a'.repeat(40)
const names = ['Main.java', 'MainTest.java', 'xmain.java', 'index.java', 'README.md']
const entry = (name) => ({ name, path: name, entryType: 'blob', objectId: 'b'.repeat(40), sizeBytes: 20 })
function setup(overrides = {}) {
  const props = { repositoryId: 'repo', commitId, api: { getTree: vi.fn().mockResolvedValue({ data: { commitId, path: '', entries: names.map(entry) } }) }, onOpenFile: vi.fn().mockResolvedValue(true), ...overrides }
  const view = render(<><GroupFileFinder key={props.commitId} {...props} /><button>Outside</button><p>Repository files remain here</p></>)
  return { ...props, ...view }
}
afterEach(() => vi.useRealTimers())

describe('Group anchored file suggestions', () => {
  it('ranks exact filenames and paths, prefixes, then partial path matches', () => {
    expect(matchGroupFiles(['folder/main.md', 'z/Main.java', 'a/XMain.java', 'main.java', 'MainTest.java'], 'MAIN.JAVA')).toEqual(['main.java', 'z/Main.java', 'a/XMain.java'])
    expect(matchGroupFiles(['z/Amain.java', 'src/MainTest.java', 'other/Main.java'], 'main')).toEqual(['other/Main.java', 'src/MainTest.java', 'z/Amain.java'])
    expect(matchGroupFiles(['src/Main.java', 'other/Main.java'], 'src/Main.java')[0]).toBe('src/Main.java')
  })
  it('debounces typeahead and shares one bounded traversal across changing queries', async () => {
    const props = setup()
    const input = screen.getByRole('combobox', { name: 'Search files' })
    fireEvent.change(input, { target: { value: 'ma' } })
    expect(props.api.getTree).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'main' } })
    expect(await screen.findByRole('option', { name: 'Main.java' })).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'read' } })
    expect(await screen.findByRole('option', { name: 'README.md' })).toBeInTheDocument()
    expect(props.api.getTree).toHaveBeenCalledOnce()
    expect(props.onOpenFile).not.toHaveBeenCalled()
    expect(screen.getByText('Repository files remain here')).toBeInTheDocument()
    expect(screen.queryByText('Find a file')).not.toBeInTheDocument()
    expect(screen.queryByText('Open exact path')).not.toBeInTheDocument()
  })
  it('supports arrows, Enter, Escape, outside click and keyboard focus without a trap', async () => {
    const props = setup(), user = userEvent.setup()
    const input = screen.getByRole('combobox', { name: 'Search files' })
    await user.type(input, 'main')
    const first = await screen.findByRole('option', { name: 'Main.java' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'MainTest.java' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(screen.getByRole('option', { name: 'xmain.java' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(props.onOpenFile).toHaveBeenCalledWith('Main.java'))
    await user.type(input, 'read')
    await screen.findByRole('option', { name: 'README.md' })
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('read')
    await user.click(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
  })
  it('opens a full existing path as a match and retains query when opening fails', async () => {
    const props = setup({ onOpenFile: vi.fn().mockResolvedValue(false) })
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'Main.java' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Main.java' }))
    await waitFor(() => expect(props.onOpenFile).toHaveBeenCalledWith('Main.java'))
    expect(screen.getByLabelText('Search files')).toHaveValue('Main.java')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
  it('shows neutral empty matches and clears without invoking a file API', async () => {
    const props = setup()
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'none' } })
    expect(await screen.findByText('No matching files.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.submit(screen.getByRole('search'))
    expect(props.onOpenFile).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Search files')).toHaveValue('')
  })
  it('keeps errors compact and safe and explicitly retries the index request', async () => {
    const api = { getTree: vi.fn().mockRejectedValueOnce(new ApiError({ status: 500, message: 'internal host path', requestId: 'private-reference' })).mockResolvedValue({ data: { commitId, path: '', entries: [entry('README.md')] } }) }
    setup({ api })
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'read' } })
    const error = await screen.findByRole('alert')
    expect(error).not.toHaveTextContent(/500|internal|private-reference/)
    expect(screen.getByLabelText('Search files')).toHaveValue('read')
    fireEvent.click(screen.getByRole('button', { name: 'Retry search' }))
    expect(await screen.findByRole('option', { name: 'README.md' })).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledTimes(2)
  })
  it('cancels a pending index on clear/unmount and ignores late private paths', async () => {
    let resolve
    const api = { getTree: vi.fn().mockReturnValue(new Promise((done) => { resolve = done })) }
    const { unmount } = setup({ api })
    fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'private' } })
    await waitFor(() => expect(api.getTree).toHaveBeenCalledOnce())
    const signal = api.getTree.mock.calls[0][2].signal
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(signal.aborted).toBe(true)
    unmount()
    await act(async () => resolve({ data: { commitId, path: '', entries: [entry('private.java')] } }))
    expect(screen.queryByText('private.java')).not.toBeInTheDocument()
  })
})
