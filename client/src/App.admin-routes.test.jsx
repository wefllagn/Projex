import { Navigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { adminChildren } from './admin/admin-routes.jsx'
import {
  AdminAuditEventsPage,
  AdminOperationalListPage,
  AdminOperationsOverviewPage,
} from './admin/AdminOperationsViews.jsx'

function route(path) {
  return adminChildren.find((candidate) => candidate.path === path)
}

describe('Phase 10D.3 canonical admin routes', () => {
  it('maps operational and audit destinations to the real Phase 10D.3 views', () => {
    expect(route('operations').element.type).toBe(AdminOperationsOverviewPage)
    expect(route('operations/execution-jobs').element.type).toBe(AdminOperationalListPage)
    expect(route('operations/execution-jobs').element.props.kind).toBe('execution')
    expect(route('operations/repository-provisioning-jobs').element.props.kind).toBe('provisioning')
    expect(route('operations/git-credentials').element.props.kind).toBe('credentials')
    expect(route('audit-events').element.type).toBe(AdminAuditEventsPage)
  })

  it.each(['storage', 'system'])('redirects the legacy %s route to canonical operations', (path) => {
    expect(route(path).element.type).toBe(Navigate)
    expect(route(path).element.props).toMatchObject({ to: '/admin/operations', replace: true })
  })
})
