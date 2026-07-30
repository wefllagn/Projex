import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Logger } from 'pino'
import type { EmailClient } from './email.types.js'

export function createPreviewEmailClient(
  previewDirectory: string,
  logger: Logger,
): EmailClient {
  const resolvedDirectory = path.resolve(previewDirectory)

  return {
    async send(message) {
      await mkdir(resolvedDirectory, { recursive: true })
      const previewFilename = `${Date.now()}-${randomUUID()}.html`
      const previewPath = path.join(resolvedDirectory, previewFilename)
      const document = [
        '<!doctype html>',
        '<html><head><meta charset="utf-8"><title>Email preview</title></head><body>',
        `<p><strong>To:</strong> ${escapeHtml(message.to)}</p>`,
        `<p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>`,
        '<hr>',
        message.html,
        '</body></html>',
      ].join('')
      await writeFile(previewPath, document, { encoding: 'utf8', flag: 'wx' })
      logger.info(
        { event: 'email.preview.created', previewFilename },
        'email preview created',
      )
      return { previewFilename }
    },
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return replacements[character] ?? character
  })
}
