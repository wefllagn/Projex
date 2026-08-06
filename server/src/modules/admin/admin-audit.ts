import type {
  AdminAuditAction,
  AdminAuditTargetType,
  Prisma,
} from '@prisma/client'

export const ADMIN_REASON_MIN_LENGTH = 10
export const ADMIN_REASON_MAX_LENGTH = 500

export interface AdminRequestContext {
  requestId: string
}

interface AuditBase {
  actorAdminId: string
  targetId?: string
  reason?: string
  requestId: string
  createdAt: Date
}

export type AdminAuditInput =
  | (AuditBase & {
      action: 'USER_STUDENT_PROVISIONED' | 'USER_INSTRUCTOR_PROVISIONED'
      targetType: 'USER'
      metadata: { provisionedRole: 'STUDENT' | 'INSTRUCTOR'; initialClassAssigned: boolean }
    })
  | (AuditBase & {
      action: 'USER_SETUP_REISSUED'
      targetType: 'USER'
      metadata: { setupState: 'SETUP_PENDING' }
    })
  | (AuditBase & {
      action: 'USER_STATUS_CHANGED'
      targetType: 'USER'
      metadata: { previousStatus: string; newStatus: string; revokedSessionCount: number }
    })
  | (AuditBase & {
      action: 'USER_SESSIONS_REVOKED'
      targetType: 'USER'
      metadata: { revokedSessionCount: number }
    })
  | (AuditBase & {
      action: 'CLASS_CREATED'
      targetType: 'CLASS'
      metadata: { instructorId: string }
    })
  | (AuditBase & {
      action:
        | 'CLASS_UPDATED'
        | 'CLASS_ARCHIVED'
        | 'CLASS_RESTORED'
        | 'CLASS_JOIN_CODE_ROTATED'
        | 'CLASS_JOIN_CODE_REVOKED'
      targetType: 'CLASS'
      metadata: { changed: boolean }
    })
  | (AuditBase & {
      action: 'CLASS_MEMBER_REMOVED' | 'CLASS_MEMBER_REACTIVATED'
      targetType: 'CLASS_MEMBER'
      metadata: { classId: string; studentId: string; changed: boolean }
    })

export type AdminAuditWriter = (
  transaction: Prisma.TransactionClient,
  input: AdminAuditInput,
) => Promise<void>

function normalizeReason(reason: string | undefined): string | undefined {
  if (reason === undefined) return undefined
  const normalized = reason.trim()
  if (
    normalized.length < ADMIN_REASON_MIN_LENGTH ||
    normalized.length > ADMIN_REASON_MAX_LENGTH
  ) {
    throw new Error('Administrative audit reason is outside the approved bounds.')
  }
  return normalized
}

export const appendAdminAuditEvent: AdminAuditWriter = async (
  transaction,
  input,
) => {
  await transaction.adminAuditEvent.create({
    data: {
      actorAdminId: input.actorAdminId,
      action: input.action as AdminAuditAction,
      targetType: input.targetType as AdminAuditTargetType,
      targetId: input.targetId,
      reason: normalizeReason(input.reason),
      requestId: input.requestId,
      metadataJson: input.metadata,
      createdAt: input.createdAt,
    },
  })
}
