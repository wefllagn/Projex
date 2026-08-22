export async function copySensitiveText(
  value,
  {
    clipboard = globalThis.navigator?.clipboard,
    documentRef = globalThis.document,
  } = {},
) {
  if (typeof clipboard?.writeText === 'function') {
    try {
      await clipboard.writeText(value)
      return 'clipboard'
    } catch {
      // LAN HTTP may not expose the secure-context Clipboard API.
    }
  }

  if (!documentRef?.body || typeof documentRef.execCommand !== 'function') {
    throw new Error('COPY_UNAVAILABLE')
  }

  const field = documentRef.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  documentRef.body.appendChild(field)
  field.select()
  field.setSelectionRange(0, field.value.length)
  try {
    if (documentRef.execCommand('copy') !== true) {
      throw new Error('COPY_UNAVAILABLE')
    }
    return 'legacy'
  } finally {
    field.remove()
  }
}
