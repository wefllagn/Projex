import type { GitTransportAccess } from '../git-transport/git-transport.types.js'

export interface GroupContextRecord {
  repositoryId: string
  project: { id: string; title: string; dueDate: Date; status: string }
  class: { id: string; className: string; status: string }
  team: { id: string; name: string; status: string; activeMemberCount: number }
  teachingStaff: { userId: string; fullName: string; role: 'PRIMARY' | 'CO_INSTRUCTOR' }[]
  gitAccess: GitTransportAccess
}

export interface GroupContextProjection extends Omit<GroupContextRecord, 'gitAccess'> {
  currentRole: 'MAINTAINER' | 'DEVELOPER' | 'INSTRUCTOR' | 'METADATA_ONLY'
  permissions: {
    canRead: boolean
    canWrite: boolean
    canUpdateMain: boolean
    canManageMembers: boolean
    canInviteMembers: boolean
    canReview: boolean
    canRequestChanges: boolean
    canSubmitForReview: boolean
    canViewActivity: boolean
    canEditFeedback: boolean
    canArchive: boolean
    canRestore: boolean
  }
}
