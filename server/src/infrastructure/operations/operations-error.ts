export class OperationsSafetyError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'OperationsSafetyError'
  }
}
