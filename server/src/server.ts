import 'dotenv/config'
import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import {
  createPrismaClient,
  createPrismaDatabaseHealth,
} from './infrastructure/database/prisma.js'
import { createLogger } from './infrastructure/logging/logger.js'
import { createPreviewEmailClient } from './infrastructure/email/preview-email-client.js'
import { createSmtpEmailClient } from './infrastructure/email/smtp-email-client.js'
import { createAccountSetupRouter } from './modules/account-setup/account-setup.routes.js'
import { createPrismaAccountSetupRepository } from './modules/account-setup/account-setup.repository.js'
import { createAccountSetupService } from './modules/account-setup/account-setup.service.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import { createAuthService } from './modules/auth/auth.service.js'
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js'
import { createPasswordService } from './modules/auth/auth.password.js'
import { createTokenService } from './modules/auth/auth.tokens.js'
import {
  createAuthenticationMiddleware,
  createCsrfMiddleware,
} from './modules/auth/auth.middleware.js'
import { createPrismaUserProvisioningRepository } from './modules/users/user-provisioning.repository.js'
import { createUserProvisioningService } from './modules/users/user-provisioning.service.js'
import { createPrismaUserDirectoryRepository } from './modules/users/user-directory.repository.js'
import { createUserDirectoryService } from './modules/users/user-directory.service.js'
import { createUsersRouter } from './modules/users/users.routes.js'
import { createPrismaClassRepository } from './modules/classes/class.repository.js'
import { createClassService } from './modules/classes/class.service.js'
import { createClassesRouter } from './modules/classes/classes.routes.js'
import { createPrismaClassMemberRepository } from './modules/class-members/class-member.repository.js'
import { createClassMemberService } from './modules/class-members/class-member.service.js'
import { createPrismaClassInvitationRepository } from './modules/class-invitations/class-invitation.repository.js'
import { createClassInvitationService } from './modules/class-invitations/class-invitation.service.js'
import { createClassInvitationRouter } from './modules/class-invitations/class-invitation.routes.js'
import { createPrismaActivityRepository } from './modules/activities/activity.repository.js'
import { createActivityService } from './modules/activities/activity.service.js'
import { createActivitiesRouter } from './modules/activities/activities.routes.js'
import { createPrismaTestCaseRepository } from './modules/test-cases/test-case.repository.js'
import { createTestCaseService } from './modules/test-cases/test-case.service.js'
import { createPrismaSubmissionRepository } from './modules/submissions/submission.repository.js'
import { createSubmissionService } from './modules/submissions/submission.service.js'
import { createSubmissionRouter } from './modules/submissions/submission.routes.js'
import { createPrismaProjectTaskRepository } from './modules/project-tasks/project-task.repository.js'
import { createProjectTaskService } from './modules/project-tasks/project-task.service.js'
import { createProjectTaskRouter } from './modules/project-tasks/project-task.routes.js'
import { createPrismaRepositoryRepository } from './modules/repositories/repository.repository.js'
import { createRepositoryService } from './modules/repositories/repository.service.js'
import { createRepositoryRouter } from './modules/repositories/repository.routes.js'
import { createRepositoryStorage } from './infrastructure/storage/repository-storage.js'
import { createGitSmartHttpBackend } from './infrastructure/git/git-smart-http.js'
import { createPrismaGitTransportRepository } from './modules/git-transport/git-transport.repository.js'
import { createGitCredentialService } from './modules/git-transport/git-credential.service.js'
import { createGitTransportService } from './modules/git-transport/git-transport.service.js'
import { createGitTransportRouter } from './modules/git-transport/git-transport.routes.js'
import { createGitRepositoryReader } from './infrastructure/git/git-repository-reader.js'
import { createRepositoryContentService } from './modules/repository-content/repository-content.service.js'
import { createRepositoryContentRouter } from './modules/repository-content/repository-content.routes.js'
import { createPrismaAdminRepository } from './modules/admin/admin.repository.js'
import { createAdminService } from './modules/admin/admin.service.js'
import { createAdminRouter } from './modules/admin/admin.routes.js'
import { createPrismaAdminOversightRepository } from './modules/admin/admin-oversight.repository.js'
import { createAdminOversightService } from './modules/admin/admin-oversight.service.js'
import { createCapabilitiesRouter } from './modules/capabilities/capabilities.routes.js'
import { createCapabilitiesService } from './modules/capabilities/capabilities.service.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger(env.logLevel)
  const prisma = createPrismaClient(env.databaseUrl)
  const passwordService = createPasswordService()
  const tokenService = createTokenService(
    env.accessTokenSecret,
    env.accessTokenTtlMinutes,
  )
  const authRepository = createPrismaAuthRepository(prisma)
  const authService = createAuthService({
    repository: authRepository,
    passwordService,
    tokenService,
    logger,
    config: { refreshTokenTtlDays: env.refreshTokenTtlDays, sessionIdleTtlMinutes: env.sessionIdleTtlMinutes },
  })
  const requireAuthentication = createAuthenticationMiddleware({
    repository: authRepository,
    tokenService,
    sessionIdleTtlMinutes: env.sessionIdleTtlMinutes,
  })
  const requireLogoutAuthentication = createAuthenticationMiddleware({
    repository: authRepository,
    tokenService,
    sessionIdleTtlMinutes: env.sessionIdleTtlMinutes,
    allowRevokedSession: true,
    allowInactiveUser: true,
  })
  const requireCsrf = createCsrfMiddleware(authService)
  const cookieConfig = {
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    accessMaxAgeMs: env.accessTokenTtlMinutes * 60 * 1000,
    refreshMaxAgeMs: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  }
  const emailClient =
    env.mailTransport === 'preview'
      ? createPreviewEmailClient(env.mailPreviewDir, logger)
      : createSmtpEmailClient({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          user: env.smtpUser,
          password: env.smtpPassword,
          fromName: env.mailFromName,
          fromAddress: env.mailFromAddress,
        })
  const accountSetupService = createAccountSetupService({
    repository: createPrismaAccountSetupRepository(prisma),
    passwordService,
    tokenService,
    logger,
  })
  const userProvisioningService = createUserProvisioningService({
    repository: createPrismaUserProvisioningRepository(prisma),
    tokenService,
    emailClient,
    logger,
    frontendOrigin: env.frontendOrigin,
    setupTokenTtlHours: env.accountSetupTokenTtlHours,
  })
  const userDirectoryService = createUserDirectoryService(
    createPrismaUserDirectoryRepository(prisma),
  )
  const adminService = createAdminService({
    repository: createPrismaAdminRepository(prisma),
    logger,
    gitProvisioningRetryEnabled: env.gitExecutionMode === 'local_process',
  })
  const adminOversightService = createAdminOversightService({
    repository: createPrismaAdminOversightRepository(prisma),
    databaseHealth: createPrismaDatabaseHealth(prisma),
  })
  const classRepository = createPrismaClassRepository(prisma)
  const classService = createClassService({
    repository: classRepository,
    logger,
  })
  const classMemberService = createClassMemberService({
    repository: createPrismaClassMemberRepository(prisma),
    classRepository,
    logger,
  })
  const classInvitationService = createClassInvitationService({
    repository: createPrismaClassInvitationRepository(prisma),
    classRepository,
    logger,
  })
  const activityRepository = createPrismaActivityRepository(prisma)
  const activityService = createActivityService({
    repository: activityRepository,
    classRepository,
    logger,
  })
  const testCaseService = createTestCaseService({
    repository: createPrismaTestCaseRepository(prisma),
    activityRepository,
    logger,
  })
  const submissionService = createSubmissionService({
    repository: createPrismaSubmissionRepository(prisma),
    logger,
    config: {
      mode: env.javaExecutionMode,
      sourceLimitBytes: env.javaSourceLimitBytes,
      practiceRunTtlHours: env.practiceRunTtlHours,
      practiceRunsPerMinute: env.practiceRunsPerMinute,
      practiceMaxActivePerActivity: env.practiceMaxActivePerActivity,
    },
  })
  const projectTaskService = createProjectTaskService({
    repository: createPrismaProjectTaskRepository(prisma),
    classRepository,
    logger,
  })
  const repositoryService = createRepositoryService({
    repository: createPrismaRepositoryRepository(prisma, {
      provisioningMaxAttempts: env.gitProvisioningMaxAttempts,
    }),
    logger,
    provisioningEnabled: env.gitExecutionMode === 'local_process',
  })
  const gitTransportRepository = createPrismaGitTransportRepository(prisma)
  const gitCredentialService = createGitCredentialService({
    issuanceEnabled: env.gitSmartHttpEnabled,
    repository: gitTransportRepository,
    logger,
    credentialTtlMinutes: env.gitCredentialTtlMinutes,
  })
  const gitStorage = createRepositoryStorage({
    root: env.gitStorageRoot || process.cwd(),
    repositorySizeLimitBytes: env.gitRepositorySizeLimitBytes,
  })
  const repositoryContentService = createRepositoryContentService({
    enabled: env.gitExecutionMode === 'local_process',
    accessRepository: gitTransportRepository,
    storage: gitStorage,
    reader: createGitRepositoryReader({
      executable: env.gitExecutable || process.execPath,
      timeoutMs: env.gitCommandTimeoutMs,
      commandOutputLimitBytes: env.gitOutputLimitBytes,
      fileLimitBytes: env.gitInspectionFileLimitBytes,
      diffLimitBytes: env.gitInspectionDiffLimitBytes,
      maxChangedFiles: env.gitInspectionMaxChangedFiles,
      maxBranches: env.gitMaxBranches,
      maxConcurrent: env.gitHttpMaxConcurrent,
    }),
    logger,
  })
  const gitSmartHttpBackend = createGitSmartHttpBackend({
    executable: env.gitHttpBackendExecutable || process.execPath,
    gitExecutable: env.gitExecutable || process.execPath,
    storageRoot: env.gitStorageRoot || process.cwd(),
    hookScript: fileURLToPath(new URL('./infrastructure/git/git-transport-hook.js', import.meta.url)),
    limits: {
      requestBytes: env.gitHttpRequestLimitBytes,
      responseBytes: env.gitHttpResponseLimitBytes,
      timeoutMs: env.gitHttpTimeoutMs,
      maxConcurrent: env.gitHttpMaxConcurrent,
      maxBranches: env.gitMaxBranches,
      maxRefUpdates: env.gitMaxRefUpdates,
      maxNewCommits: env.gitMaxNewCommits,
      blobLimitBytes: env.gitBlobLimitBytes,
      repositoryLimitBytes: env.gitRepositorySizeLimitBytes,
    },
  })
  const gitTransportService = createGitTransportService({
    enabled: env.gitSmartHttpEnabled,
    credentialService: gitCredentialService,
    repository: gitTransportRepository,
    storage: gitStorage,
    backend: gitSmartHttpBackend,
    logger,
  })
  await gitTransportService.initialize()
  const app = createApp({
    config: {
      frontendOrigin: env.frontendOrigin,
      requestBodyLimit: env.requestBodyLimit,
      trustProxyHops: env.trustProxyHops,
    },
    databaseHealth: createPrismaDatabaseHealth(prisma),
    logger,
    featureRouters: {
      capabilities: createCapabilitiesRouter(createCapabilitiesService({
        profile: env.nodeEnv === 'production' ? 'HOSTED_SAFE' : 'LOCAL_FULL',
        java: { execution: env.javaExecutionMode === 'local_process' },
        git: {
          provisioning: env.gitExecutionMode === 'local_process',
          inspection: env.gitExecutionMode === 'local_process',
          smartHttp: env.gitSmartHttpEnabled,
        },
      })),
      auth: createAuthRouter({
        authService,
        cookieConfig,
        requireAuthentication,
        requireLogoutAuthentication,
        requireCsrf,
      }),
      accountSetup: createAccountSetupRouter(accountSetupService),
      admin: createAdminRouter({
        service: adminService,
        oversightService: adminOversightService,
        requireAuthentication,
        requireCsrf,
      }),
      users: createUsersRouter({
        directoryService: userDirectoryService,
        provisioningService: userProvisioningService,
        requireAuthentication,
        requireCsrf,
      }),
      classes: createClassesRouter({
        classService,
        classMemberService,
        activityService,
        projectTaskService,
        requireAuthentication,
        requireCsrf,
      }),
      classInvitations: createClassInvitationRouter({
        service: classInvitationService,
        requireAuthentication,
        requireCsrf,
      }),
      activities: createActivitiesRouter({
        activityService,
        testCaseService,
        requireAuthentication,
        requireCsrf,
      }),
      submissions: createSubmissionRouter({
        service: submissionService,
        requireAuthentication,
        requireCsrf,
      }),
      projectTasks: createProjectTaskRouter({
        service: projectTaskService,
        requireAuthentication,
        requireCsrf,
      }),
      repositories: createRepositoryRouter({
        service: repositoryService,
        requireAuthentication,
        requireCsrf,
      }),
      gitTransport: createGitTransportRouter({
        credentialService: gitCredentialService,
        transportService: gitTransportService,
        requireAuthentication,
        requireCsrf,
      }),
      repositoryContent: createRepositoryContentRouter({
        service: repositoryContentService,
        requireAuthentication,
      }),
    },
  })
  const httpServer = createServer(app)
  let isShuttingDown = false

  const shutdown = async (reason: string, exitCode = 0): Promise<void> => {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    logger.info({ reason }, 'server shutdown started')

    const forceShutdown = setTimeout(() => {
      logger.fatal({ reason }, 'server shutdown timed out')
      process.exit(1)
    }, 10_000)
    forceShutdown.unref()

    await closeServer(httpServer)
    await prisma.$disconnect()
    clearTimeout(forceShutdown)
    logger.info({ reason }, 'server shutdown completed')
    process.exit(exitCode)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('uncaughtException', (error) => {
    logger.fatal({ errorType: error.name }, 'uncaught exception')
    void shutdown('uncaughtException', 1)
  })
  process.on('unhandledRejection', (reason) => {
    logger.fatal(
      { errorType: reason instanceof Error ? reason.name : typeof reason },
      'unhandled rejection',
    )
    void shutdown('unhandledRejection', 1)
  })

  httpServer.listen(env.port, env.host, () => {
    logger.info(
      {
        nodeEnv: env.nodeEnv,
        port: env.port,
        host: env.host,
      },
      'Projex API listening',
    )
  })
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

bootstrap().catch((error: unknown) => {
  if (error instanceof EnvironmentValidationError) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write('Server failed to start.\n')
  }

  process.exitCode = 1
})
