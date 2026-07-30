import type { EmailMessage } from './email.types.js'

export function createAccountSetupEmail(input: {
  recipientName: string
  accountEmail: string
  setupUrl: string
  expiresInHours: number
}): EmailMessage {
  const name = escapeHtml(input.recipientName)
  const email = escapeHtml(input.accountEmail)
  const url = escapeHtml(input.setupUrl)

  return {
    to: input.accountEmail,
    subject: 'Set up your Projex account',
    text: [
      `Hello ${input.recipientName},`,
      '',
      `A Projex account was provisioned for ${input.accountEmail}.`,
      `Choose your password using this setup link: ${input.setupUrl}`,
      `This link expires after ${input.expiresInHours} hours.`,
      'If the link expires, contact your instructor or administrator for a new link.',
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      `<p>A Projex account was provisioned for <strong>${email}</strong>.</p>`,
      `<p><a href="${url}">Choose your Projex password</a></p>`,
      `<p>This link expires after ${input.expiresInHours} hours.</p>`,
      '<p>If the link expires, contact your instructor or administrator for a new link.</p>',
    ].join(''),
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
