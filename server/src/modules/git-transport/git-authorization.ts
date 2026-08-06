import type { GitPermission, GitTransportAccess } from './git-transport.types.js'

export function evaluateGitPermission(access: GitTransportAccess, now: Date): GitPermission {
  if (access.user.status !== 'ACTIVE' || access.storageStatus !== 'READY') {
    return { read: false, write: false, canUpdateMain: false }
  }

  const activeRepositoryMember = access.repositoryMember?.status === 'ACTIVE'
  const activeClassStudent =
    access.user.role === 'STUDENT' &&
    access.projectTask?.class.membership?.status === 'ACTIVE'
  const instructorOwnsClass =
    access.user.role === 'INSTRUCTOR' &&
    access.projectTask?.class.instructorId === access.user.id

  let read = false
  if (access.repositoryType === 'PERSONAL') {
    read = activeRepositoryMember
  } else {
    read = (activeRepositoryMember && activeClassStudent) || instructorOwnsClass
  }

  if (!read || access.status !== 'ACTIVE') {
    return { read, write: false, canUpdateMain: false }
  }

  if (access.repositoryType === 'PERSONAL') {
    const writer =
      access.user.role === 'STUDENT' &&
      activeRepositoryMember &&
      access.repositoryMember?.memberRole !== 'VIEWER'
    return {
      read,
      write: writer,
      canUpdateMain: writer && access.ownerId === access.user.id,
    }
  }

  const taskOpen =
    access.projectTask?.class.status === 'ACTIVE' &&
    access.projectTask.status === 'PUBLISHED' &&
    access.projectTask.dueDate.getTime() > now.getTime() &&
    ['WORKING', 'CHANGES_REQUESTED'].includes(access.reviewStatus)
  const writer =
    access.user.role === 'STUDENT' &&
    activeClassStudent &&
    activeRepositoryMember &&
    access.repositoryMember?.memberRole !== 'VIEWER' &&
    access.teamMember?.status === 'ACTIVE' &&
    taskOpen
  return {
    read,
    write: writer,
    canUpdateMain:
      writer &&
      access.ownerId === access.user.id &&
      access.teamLeadStudentId === access.user.id,
  }
}
