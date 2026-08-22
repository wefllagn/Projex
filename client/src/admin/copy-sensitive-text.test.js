import { describe, expect, it, vi } from 'vitest'
import { copySensitiveText } from './copy-sensitive-text.js'

describe('copySensitiveText', () => {
  it('uses the Clipboard API when the secure-context capability exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    await expect(copySensitiveText('sensitive-link', {
      clipboard: { writeText },
      documentRef: null,
    })).resolves.toBe('clipboard')
    expect(writeText).toHaveBeenCalledWith('sensitive-link')
  })

  it('falls back to a transient selection when Clipboard API is unavailable on LAN HTTP', async () => {
    const field = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove: vi.fn(),
    }
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn().mockReturnValue(field),
      execCommand: vi.fn().mockReturnValue(true),
    }
    await expect(copySensitiveText('lan-sensitive-link', {
      clipboard: undefined,
      documentRef,
    })).resolves.toBe('legacy')
    expect(field.value).toBe('lan-sensitive-link')
    expect(documentRef.execCommand).toHaveBeenCalledWith('copy')
    expect(field.remove).toHaveBeenCalled()
  })

  it('removes the transient field when legacy copy fails', async () => {
    const field = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove: vi.fn(),
    }
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn().mockReturnValue(field),
      execCommand: vi.fn().mockReturnValue(false),
    }
    await expect(copySensitiveText('sensitive-link', {
      clipboard: undefined,
      documentRef,
    })).rejects.toThrow('COPY_UNAVAILABLE')
    expect(field.remove).toHaveBeenCalled()
  })
})
