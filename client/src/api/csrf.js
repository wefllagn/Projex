export const CSRF_COOKIE_NAME = 'projex_csrf'
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

export function readCookie(name, cookieString = globalThis.document?.cookie ?? '') {
  const encodedName = encodeURIComponent(name)
  const entry = cookieString
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${encodedName}=`))

  if (!entry) return null

  const value = entry.slice(entry.indexOf('=') + 1)
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export function readCsrfToken(cookieString) {
  return readCookie(CSRF_COOKIE_NAME, cookieString)
}
