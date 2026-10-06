import { describe, expect, it, vi } from 'vitest'
import { compilerLines, editJavaSelection, MAX_SOURCE_BYTES, readJavaFile } from './java-source-tools.js'

const source = 'public class AlingNenaStore {}'
const file = (text = source, name = 'AlingNenaStore.java') => {
  const bytes = new TextEncoder().encode(text)
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer }
}

describe('Java file import contract', () => {
  it('accepts UTF-8 BOM and normalizes line endings without changing program text', async () => {
    expect(await readJavaFile([file('\uFEFF' + source + '\r\n// café\r')], 'AlingNenaStore')).toBe(source + '\n// café\n')
  })
  it.each([{ files: [] }, { files: [file(), file()] }])('requires exactly one file', async ({ files }) => {
    await expect(readJavaFile(files, 'AlingNenaStore')).rejects.toThrow('exactly one')
  })
  it.each(['Main.java', 'AlingNenaStore.JAVA', '../AlingNenaStore.java', 'C:\\AlingNenaStore.java', 'AlingNenaStore.java.exe'])('rejects wrong or unsafe filename %s', async (name) => {
    await expect(readJavaFile([file(source, name)], 'AlingNenaStore')).rejects.toThrow('filename')
  })
  it('rejects byte overflow before reading and decoded character overflow', async () => {
    const arrayBuffer = vi.fn()
    await expect(readJavaFile([{ ...file(), size: MAX_SOURCE_BYTES + 1, arrayBuffer }], 'AlingNenaStore')).rejects.toThrow('too large')
    expect(arrayBuffer).not.toHaveBeenCalled()
    await expect(readJavaFile([file(source.padEnd(100001))], 'AlingNenaStore')).rejects.toThrow('100,000')
    expect((await readJavaFile([file(source.padEnd(100000))], 'AlingNenaStore')).length).toBe(100000)
  })
  it('rejects multibyte source beyond the backend UTF-8 budget even below the character limit', async () => {
    const text = source + '// ' + '界'.repeat(33333)
    expect(text.length).toBeLessThan(100000)
    await expect(readJavaFile([file(text)], 'AlingNenaStore')).rejects.toThrow(/too large|100,000 bytes/)
    const justOverBudget = (source + '// ' + '界'.repeat(10)).padEnd(99981)
    expect(file(justOverBudget).size).toBe(100001)
    await expect(readJavaFile([file(justOverBudget)], 'AlingNenaStore')).rejects.toThrow('100,000 bytes')
    const fits = source + '// ' + '界'.repeat(33000)
    expect(await readJavaFile([file(fits)], 'AlingNenaStore')).toBe(fits)
    // The three-byte BOM must not count as submitted source.
    expect(await readJavaFile([file('\uFEFF' + source.padEnd(100000))], 'AlingNenaStore')).toBe(source.padEnd(100000))
  })
  it.each(['', '   ', source + '\0', 'package exercises.prelim; ' + source, 'public class Other {}', '// ' + source, 'class Other { String s = "public class AlingNenaStore {}"; }', 'class Outer { public class AlingNenaStore {} }', source + ' public class Other {}'])('rejects unsuitable source', async (text) => {
    await expect(readJavaFile([file(text)], 'AlingNenaStore')).rejects.toThrow()
  })
  it('ignores comments and literals and accepts ordinary modifiers', async () => {
    const text = '/* package old; */ public final class AlingNenaStore { String s = "package old;"; }'
    expect(await readJavaFile([file(text)], 'AlingNenaStore')).toBe(text)
  })
  it('rejects malformed UTF-8 and failed reads', async () => {
    await expect(readJavaFile([{ ...file(), arrayBuffer: async () => new Uint8Array([0xc3, 0x28]).buffer }], 'AlingNenaStore')).rejects.toThrow('UTF-8')
    await expect(readJavaFile([{ ...file(), arrayBuffer: async () => { throw new Error('private path') } }], 'AlingNenaStore')).rejects.toThrow('Could not read UTF-8')
  })
})

describe('source editing and diagnostics', () => {
  it('indents to a tab stop and adds indentation after an opening brace', () => {
    expect(editJavaSelection('ab', 2, 2, 'Tab')).toEqual({ value: 'ab  ', start: 4, end: 4 })
    expect(editJavaSelection('    if (true) {', 15, 15, 'Enter')).toEqual({ value: '    if (true) {\n        ', start: 24, end: 24 })
  })
  it('indents selected lines but excludes the next line at an end boundary', () => {
    expect(editJavaSelection('a\nb\nc', 0, 4, 'Tab')).toEqual({ value: '    a\n    b\nc', start: 4, end: 12 })
  })
  it('edits the first empty line without skipping it', () => {
    expect(editJavaSelection('\na', 0, 0, 'Enter')).toEqual({ value: '\n\na', start: 1, end: 1 })
    expect(editJavaSelection('\na', 0, 1, 'Tab')).toEqual({ value: '    \na', start: 4, end: 5 })
  })
  it('unindents mixed whitespace and clamps a caret inside indentation', () => {
    expect(editJavaSelection('  a\n\tb', 0, 6, 'Tab', true)).toEqual({ value: 'a\nb', start: 0, end: 3 })
    expect(editJavaSelection('    a', 2, 2, 'Tab', true)).toEqual({ value: 'a', start: 0, end: 0 })
  })
  it('only links bounded javac references to the activity file', () => {
    expect(compilerLines('Main.java:2: error: bad\nMain.java:2: warning: bad\nOther.java:1: error\n/private/Main.java:1: error\nMain.java:0: error\nMain.java:99: error', 'Main', 'a\nb')).toEqual([2])
  })
})
