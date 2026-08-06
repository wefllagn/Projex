import type {
  ClassMemberStatus,
  ClassStatus,
  GitCredentialOperation,
  ProjectTaskStatus,
  RepositoryMemberRole,
  RepositoryMemberStatus,
  RepositoryReviewStatus,
  RepositoryStatus,
  RepositoryStorageStatus,
  RepositoryType,
  TeamMemberStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'

export interface GitTransportAccess {
  repositoryId: string
  repositoryType: RepositoryType
  ownerId: string
  status: RepositoryStatus
  storageStatus: RepositoryStorageStatus
  storagePath: string | null
  reviewStatus: RepositoryReviewStatus
  user: { id: string; role: UserRole; status: UserStatus }
  repositoryMember: {
    memberRole: RepositoryMemberRole
    status: RepositoryMemberStatus
  } | null
  teamMember: { status: TeamMemberStatus } | null
  projectTask: {
    status: ProjectTaskStatus
    dueDate: Date
    class: {
      instructorId: string
      status: ClassStatus
      membership: { status: ClassMemberStatus } | null
    }
  } | null
  teamLeadStudentId: string | null
}

export interface GitPermission {
  read: boolean
  write: boolean
  canUpdateMain: boolean
}

export interface GitCredentialProjection {
  credentialId: string
  repositoryId: string
  operations: GitCredentialOperation[]
  createdAt: Date
  expiresAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export interface IssuedGitCredential extends GitCredentialProjection {
  username: string
  secret: string
}

export interface AuthenticatedGitRequest {
  credentialId: string
  userId: string
  repositoryId: string
  operation: GitCredentialOperation
  access: GitTransportAccess
  permission: GitPermission
}

export interface AcceptedPushReceipt {
  operationId: string
  repositoryId: string
  userId: string
  branches: string[]
  refUpdateCount: number
  acceptedAt: string
}
