export class JavaInfrastructureError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'JavaInfrastructureError' }
}
