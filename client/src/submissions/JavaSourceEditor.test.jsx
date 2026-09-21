import { useRef, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import JavaSourceEditor from './JavaSourceEditor.jsx'

function Harness({ initial = 'public class Main {}' }) {
  const [value, setValue] = useState(initial)
  const editorRef = useRef(null)
  return <><JavaSourceEditor value={value} onChange={setValue} entryClassName="Main" editorRef={editorRef} /><button>After editor</button></>
}
const fakeFile = (source) => ({ name: 'Main.java', size: source.length, arrayBuffer: async () => new TextEncoder().encode(source).buffer })

describe('Java editor interactions', () => {
  it('preserves source on cancellation and imports only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<Harness />)
    const input = screen.getByLabelText('Import Java file')
    const imported = 'public class Main { // imported\n}'
    fireEvent.change(input, { target: { files: [fakeFile(imported)] } })
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('textbox')).toHaveValue('public class Main {}')
    fireEvent.change(input, { target: { files: [fakeFile(imported)] } })
    await screen.findByText(/Java file imported/)
    expect(screen.getByRole('textbox')).toHaveValue(imported)
    expect(input.value).toBe('')
  })
  it('does not confirm invalid files and does not replace existing source', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Import Java file'), { target: { files: [fakeFile('package old; public class Main {}')] } })
    await screen.findByText(/Remove the package/)
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toHaveValue('public class Main {}')
  })
  it('ignores a read completing after the activity editor unmounts', async () => {
    let resolve
    const confirm = vi.spyOn(window, 'confirm')
    const { unmount } = render(<Harness />)
    fireEvent.change(screen.getByLabelText('Import Java file'), { target: { files: [{ ...fakeFile(''), arrayBuffer: () => new Promise((done) => { resolve = done }) }] } })
    unmount()
    await act(async () => resolve(new TextEncoder().encode('public class Main {}').buffer))
    expect(confirm).not.toHaveBeenCalled()
  })
  it('edits indentation, retains selection, auto-indents and permits keyboard exit', async () => {
    const user = userEvent.setup()
    render(<Harness initial={'a\nb'} />)
    const editor = screen.getByRole('textbox')
    editor.focus()
    editor.setSelectionRange(0, 3)
    fireEvent.keyDown(editor, { key: 'Tab' })
    expect(editor).toHaveValue('    a\n    b')
    expect(editor.selectionEnd).toBe(11)
    fireEvent.keyDown(editor, { key: 'Tab', shiftKey: true })
    expect(editor).toHaveValue('a\nb')
    fireEvent.change(editor, { target: { value: '    {' } })
    editor.setSelectionRange(5, 5)
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(editor).toHaveValue('    {\n        ')
    fireEvent.keyDown(editor, { key: 'Escape' })
    await user.tab()
    expect(screen.getByRole('button', { name: 'After editor' })).toHaveFocus()
  })
  it('synchronizes gutters and guides without wrapping source', () => {
    const { container } = render(<Harness />)
    const editor = screen.getByRole('textbox')
    fireEvent.scroll(editor, { target: { scrollTop: 46, scrollLeft: 50 } })
    expect(container.querySelector('.java-source-gutter > div').style.transform).toBe('translateY(-46px)')
    expect(container.querySelector('.java-source-guides > div').style.transform).toBe('translate(-50px, -46px)')
    expect(editor).toHaveAttribute('wrap', 'off')
  })
})
