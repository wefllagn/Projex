export interface AppErrorOptions {
  statusCode: number
  code: string
  message: string
  details?: Record<string, unknown>
  cause?: unknown
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, unknown>
  override readonly cause?: unknown

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'AppError'
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
    this.cause = options.cause
  }
}
