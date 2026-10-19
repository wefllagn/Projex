import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupCommitCount } from './GroupCommitCount.jsx'

const branch = { branchName: 'feature/enrollment', commitId: 'a'.repeat(40) }
const result = (totalItems = 103, commitId = branch.commitId) => ({ data: [{ commitId }], pagination: { totalItems } })
describe('Group selected-branch commit count', () => {
  it('uses the exact history total, not the returned page length, and opens history', async () => {
    const api = { listCommits: vi.fn().mockResolvedValue(result()) }, onOpen = vi.fn()
    render(<GroupCommitCount api={api} repositoryId="repo" branch={branch} refreshVersion={0} onOpen={onOpen} />)
    fireEvent.click(await screen.findByRole('button', { name: '103 Commits' }))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(api.listCommits).toHaveBeenCalledWith('repo', { branchName: branch.branchName, page: 1, limit: 1 }, expect.any(Object))
  })
  it.each([{}, result(-1), result(1, 'b'.repeat(40))])('does not fabricate a count from incomplete or moved history', async (response) => {
    const api = { listCommits: vi.fn().mockResolvedValue(response) }
    render(<GroupCommitCount api={api} repositoryId="repo" branch={branch} refreshVersion={0} onOpen={vi.fn()} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Commits' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\d+ Commit/ })).not.toBeInTheDocument()
  })
  it('ignores old-branch responses and revalidates the selected branch after refresh', async () => {
    let finish
    const api = { listCommits: vi.fn().mockReturnValueOnce(new Promise((done) => { finish = done })).mockResolvedValue(result(1, 'b'.repeat(40))) }
    const next = { branchName: 'main', commitId: 'b'.repeat(40) }
    const view = render(<GroupCommitCount api={api} repositoryId="repo" branch={branch} refreshVersion={0} onOpen={vi.fn()} />)
    await act(async () => { await Promise.resolve() })
    view.rerender(<GroupCommitCount api={api} repositoryId="repo" branch={next} refreshVersion={0} onOpen={vi.fn()} />)
    expect(await screen.findByRole('button', { name: '1 Commit' })).toBeInTheDocument()
    await act(async () => finish(result()))
    expect(screen.queryByRole('button', { name: '103 Commits' })).not.toBeInTheDocument()
    expect(api.listCommits.mock.calls[0][2].signal.aborted).toBe(true)
    view.rerender(<GroupCommitCount api={api} repositoryId="repo" branch={next} refreshVersion={1} onOpen={vi.fn()} />)
    expect(await screen.findByRole('button', { name: '1 Commit' })).toBeInTheDocument()
    expect(api.listCommits).toHaveBeenCalledTimes(3)
  })
})
