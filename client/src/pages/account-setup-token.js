export function consumeSetupToken({ location = window.location, history = window.history } = {}) {
  const fragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash)
  const token = fragment.get('token') || fragment.get('setupToken') || ''
  history.replaceState(history.state, '', `${location.pathname}${location.search}`)
  return token
}
