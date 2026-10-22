import { describe, expect, it } from 'vitest'
import { browserCommitInput, isBrowserFilePath } from './group-browser-commit.schemas.js'
const input = { branchName: 'main', filePath: 'README.md', operation: 'CREATE', content: '# Project\n', commitMessage: 'Initialize project', expectedHeadCommitHash: null }
describe('Group browser commit validation', () => {
  it.each(['../a.java','/a.java','C:/a.java','a\\b.java','.git/config','src/.GIT/a.java','CON.java','src/aux.txt','a./b.java','a//b.java','a.lock','a.sh','a:b.java','-a.java','src/../a.md','a.exe','a/COM1.txt'])('rejects unsafe or unsupported path %s', filePath => expect(isBrowserFilePath(filePath)).toBe(false))
  it.each(['README.md','src/Main.java','src/ui/App.tsx','docs/usage.txt'])('accepts bounded text path %s', filePath => expect(browserCommitInput.safeParse({ ...input,filePath }).success).toBe(true))
  it('rejects oversized UTF-8, nulls, unpaired surrogates and option-like refs', () => {
    for (const content of ['a'.repeat(65537),'é'.repeat(32769),'a\0b','\uD800']) expect(browserCommitInput.safeParse({ ...input, content }).success).toBe(false)
    expect(browserCommitInput.safeParse({ ...input,branchName:'--help' }).success).toBe(false)
    expect(browserCommitInput.safeParse({ ...input,commitMessage:'line\nbreak' }).success).toBe(false)
  })
})
