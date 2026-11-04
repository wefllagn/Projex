import { request } from 'node:http'

/** Fixed loopback target, bounded response and deadline; never follows redirects. */
export function createIsolatedGitAvailability(enabled: boolean, port: number, timeoutMs = 500) {
  return async (): Promise<boolean> => {
    if (!enabled) return false
    return new Promise(resolve => {
      let settled = false
      const finish = (ready: boolean) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        req.destroy()
        resolve(ready)
      }
      const req = request({ hostname: '127.0.0.1', port, path: '/internal/git/ready', method: 'GET', agent: false }, response => {
        let body = ''
        response.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8')
          if (body.length > 128) finish(false)
        })
        response.on('error', () => finish(false))
        response.on('end', () => {
          try { finish(response.statusCode === 200 && JSON.parse(body).ready === true) }
          catch { finish(false) }
        })
      })
      const timer = setTimeout(() => finish(false), timeoutMs)
      req.on('error', () => finish(false))
      req.end()
    })
  }
}
