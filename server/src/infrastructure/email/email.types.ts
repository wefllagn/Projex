export interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface EmailDeliveryResult {
  previewFilename?: string
  messageId?: string
}

export interface EmailClient {
  send(message: EmailMessage): Promise<EmailDeliveryResult>
}
