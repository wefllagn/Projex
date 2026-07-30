import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PasswordService } from '../auth/auth.password.js'
import type { TokenService } from '../auth/auth.tokens.js'
import type { AccountSetupRepository } from './account-setup.repository.js'

export interface AccountSetupService {
  complete(setupToken: string, password: string): Promise<void>
}

export function createAccountSetupService(dependencies: {
  repository: AccountSetupRepository
  passwordService: PasswordService
  tokenService: TokenService
  logger: Logger
  now?: () => Date
}): AccountSetupService {
  const {
    repository,
    passwordService,
    tokenService,
    logger,
    now = () => new Date(),
  } = dependencies

  return {
    async complete(setupToken, password) {
      passwordService.assertPolicy(password)
      const passwordHash = await passwordService.hash(password)
      const user = await repository.completeSetup({
        tokenHash: tokenService.hashOpaqueToken(setupToken),
        passwordHash,
        completedAt: now(),
      })
      if (!user) {
        throw new AppError({
          statusCode: 400,
          code: 'SETUP_TOKEN_INVALID',
          message: 'The account setup link is invalid or expired.',
        })
      }
      logger.info(
        { event: 'auth.setup.completed', userId: user.id },
        'account setup completed',
      )
    },
  }
}
