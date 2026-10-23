import { ApiError } from '../api/api-client.js'
import { groupContextProjection } from './repository-projections.js'
import { RepositoryCodeMenu } from './RepositoryCodeMenu.jsx'

export function GroupCodeMenu({ repository, context, api, gitApi, available, onOpenChange }) {
  const validateAccess = async (write) => {
    const live = groupContextProjection((await api.getGroupContext(repository.id)).data, repository)
    if (!live.permissions.canRead || (write && !live.permissions.canWrite)) throw new ApiError({ status: 403, code: 'FORBIDDEN' })
    return live.permissions
  }
  return <RepositoryCodeMenu repository={repository} gitApi={gitApi} available={available && context.permissions.canRead} canWrite={context.permissions.canWrite} validateAccess={validateAccess} label="Group native Git access" onOpenChange={onOpenChange} />
}
