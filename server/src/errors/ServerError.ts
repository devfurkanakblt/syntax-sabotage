import type { ErrorCode } from '../../../shared/socketProtocol'

export class ServerError extends Error {
  public readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'ServerError'
  }
}
