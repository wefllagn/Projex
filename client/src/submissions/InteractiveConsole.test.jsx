import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InteractiveConsole from './InteractiveConsole.jsx'

function setup(overrides = {}) {
  const ref = createRef()
  const running = { id:'run', activityId:'activity', phase:'RUNNING', transcript:'Name: ', nextSequence:1, inputClosed:false }
  const api = { createInteractiveCodeRun:vi.fn().mockResolvedValue({data:running}), getInteractiveCodeRun:vi.fn().mockResolvedValue({data:running}),
    sendInteractiveInput:vi.fn().mockResolvedValue({data:{...running,nextSequence:2}}), stopInteractiveCodeRun:vi.fn().mockResolvedValue({data:{...running,phase:'CANCELLED'}}), ...overrides }
  render(<InteractiveConsole ref={ref} activityId="activity" source="class Main {}" api={api} onActiveChange={vi.fn()} />)
  return { ref, api }
}
describe('interactive console controls', () => {
  it('sends Enter and blank lines without trimming and keeps Stop accessible', async () => {
    const {ref, api} = setup()
    await act(async () => ref.current.start('class Main {}'))
    await userEvent.type(screen.getByLabelText('Program input'), '  Julius  {Enter}')
    expect(api.sendInteractiveInput).toHaveBeenCalledWith('run',{sequence:1,text:'  Julius  ',eof:false})
    await waitFor(() => expect(screen.getByLabelText('Program input')).toHaveValue(''))
    fireEvent.submit(screen.getByLabelText('Program input').closest('form'))
    await waitFor(() => expect(api.sendInteractiveInput).toHaveBeenLastCalledWith('run',{sequence:2,text:'',eof:false}))
    await userEvent.click(screen.getByRole('button',{name:'Stop'}))
    expect(api.stopInteractiveCodeRun).toHaveBeenCalledWith('run')
    expect(await screen.findByText('Stopped',{selector:'span'})).toBeInTheDocument()
  })
  it('retries an uncertain input using the exact same sequence and content', async () => {
    const send = vi.fn().mockRejectedValueOnce({code:'NETWORK_ERROR'}).mockResolvedValue({data:{id:'run',activityId:'activity',phase:'RUNNING',transcript:'Name: Julius',nextSequence:2}})
    const {ref} = setup({sendInteractiveInput:send})
    await act(async () => ref.current.start('class Main {}'))
    await userEvent.type(screen.getByLabelText('Program input'),'Julius{Enter}')
    const retry = await screen.findByRole('button',{name:'Retry input'})
    await userEvent.click(retry)
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1])
    expect(await screen.findByLabelText('Program input')).toHaveValue('')
  })
  it('renders program HTML as plain text and displays exit status', async () => {
    const {ref} = setup({createInteractiveCodeRun:vi.fn().mockResolvedValue({data:{id:'run',activityId:'activity',phase:'COMPLETED',transcript:'<img src=x onerror=alert(1)>',exitCode:0}})})
    await act(async () => ref.current.start('class Main {}'))
    expect(screen.getByLabelText('Java console output')).toHaveTextContent('<img src=x onerror=alert(1)>')
    expect(screen.getByText('Process finished with exit code 0')).toBeInTheDocument()
    expect(screen.queryByLabelText('Program input')).not.toBeInTheDocument()
    expect(document.querySelector('.interactive-console-output img')).toBeNull()
  })
  it('reuses a start request key and source after an ambiguous response', async () => {
    const create = vi.fn().mockRejectedValueOnce({code:'NETWORK_ERROR'}).mockResolvedValue({data:{id:'run',activityId:'activity',phase:'COMPLETED',transcript:'ok',exitCode:0}})
    const {ref} = setup({createInteractiveCodeRun:create})
    await act(async () => ref.current.start('class Main {}'))
    await userEvent.click(await screen.findByRole('button',{name:'Retry console status'}))
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1])
  })
  it('does not regress an input acknowledgment when an older poll response arrives late', async () => {
    let finishPoll
    const running = { id:'run',activityId:'activity',phase:'RUNNING',transcript:'Name: ',nextSequence:1,inputClosed:false }
    const get = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finishPoll = resolve }))
      .mockResolvedValue({data:{...running,nextSequence:2}})
    const {ref,api} = setup({getInteractiveCodeRun:get})
    await act(async () => ref.current.start('class Main {}'))
    await waitFor(() => expect(get).toHaveBeenCalled())
    await userEvent.type(screen.getByLabelText('Program input'),'Julius{Enter}')
    await waitFor(() => expect(screen.getByLabelText('Program input')).toHaveValue(''))
    await act(async () => finishPoll({data:running}))
    await userEvent.type(screen.getByLabelText('Program input'),'23{Enter}')
    expect(api.sendInteractiveInput).toHaveBeenLastCalledWith('run',{sequence:2,text:'23',eof:false})
  })

})
