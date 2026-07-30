import nodemailer from 'nodemailer'
import type { EmailClient } from './email.types.js'

export interface SmtpEmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  fromAddress: string
}

export function createSmtpEmailClient(config: SmtpEmailConfig): EmailClient {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })

  return {
    async send(message) {
      const result = await transporter.sendMail({
        from: { name: config.fromName, address: config.fromAddress },
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
      return { messageId: result.messageId }
    },
  }
}
