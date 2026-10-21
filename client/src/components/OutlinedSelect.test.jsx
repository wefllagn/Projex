import AppDialog from './AppDialog.jsx'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OutlinedSelect from './OutlinedSelect.jsx'

const options = [{ value: 'all', label: 'All topics' }, { value: 'none', label: 'No topic' }, { value: 'java', label: 'Java fundamentals' }]
function Harness({ change }) { const [value, setValue] = useState('all'); return <><OutlinedSelect label="Topic filter" value={value} options={options} onChange={next => { change(next); setValue(next) }} /><button>Other action</button></> }
describe('outlined Projex select', () => {
  it('supports keyboard selection, selected state and Escape without changing the value', async () => {
    const user = userEvent.setup(), change = vi.fn()
    render(<Harness change={change} />)
    const select = screen.getByRole('combobox', { name: 'Topic filter' })
    await user.click(select)
    expect(select).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'All topics' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}{Enter}')
    expect(change).toHaveBeenCalledExactlyOnceWith('java')
    expect(select).toHaveTextContent('Java fundamentals')
    expect(select).toHaveFocus()
    await user.click(select)
    await user.keyboard('{Home}{Escape}')
    expect(select).toHaveAttribute('aria-expanded', 'false')
    expect(select).toHaveTextContent('Java fundamentals')
    expect(change).toHaveBeenCalledTimes(1)
  })
  it('selects by pointer and closes on outside interaction', async () => {
    const user = userEvent.setup(), change = vi.fn()
    render(<Harness change={change} />)
    const select = screen.getByRole('combobox', { name: 'Topic filter' })
    await user.click(select)
    await user.click(screen.getByRole('option', { name: 'No topic' }))
    expect(change).toHaveBeenCalledWith('none')
    await user.click(select)
    await user.click(screen.getByRole('button', { name: 'Other action' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(select).toHaveTextContent('No topic')
  })
})


it('lets Escape close a popup before its containing dialog', async () => {
  const close = vi.fn(), user = userEvent.setup()
  render(<AppDialog title="History" onClose={close}><Harness change={vi.fn()} /></AppDialog>)
  const select = screen.getByRole('combobox', { name: 'Topic filter' })
  await user.click(select)
  await user.keyboard('{Escape}')
  expect(select).toHaveAttribute('aria-expanded', 'false')
  expect(close).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(close).toHaveBeenCalledTimes(1)
})
