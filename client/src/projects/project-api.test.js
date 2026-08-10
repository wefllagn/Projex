import { describe, expect, it, vi } from 'vitest'
import { createProjectApi } from './project-api.js'

describe('project API', () => {
  it('maps project-task reads, writes, lifecycle, teams, and monitoring', async () => {
    const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}), patch: vi.fn().mockResolvedValue({}) }
    const api = createProjectApi(client)
    await api.listProjectTasks('class-1', { page: 2, pageSize: 20, status: 'PUBLISHED' })
    await api.getProjectTask('task-1')
    await api.createProjectTask('class-1', { title: 'Project' })
    await api.updateProjectTask('task-1', { expectedUpdatedAt: 'version' })
    await api.transitionProjectTask('task-1', 'publish', { expectedUpdatedAt: 'version' })
    await api.listTeams('task-1')
    await api.getMonitoring('task-1')
    expect(client.get).toHaveBeenNthCalledWith(1, '/classes/class-1/project-tasks?page=2&pageSize=20&status=PUBLISHED', undefined)
    expect(client.get).toHaveBeenNthCalledWith(2, '/project-tasks/task-1', undefined)
    expect(client.post).toHaveBeenNthCalledWith(1, '/classes/class-1/project-tasks', { title: 'Project' }, undefined)
    expect(client.patch).toHaveBeenCalledWith('/project-tasks/task-1', { expectedUpdatedAt: 'version' }, undefined)
    expect(client.post).toHaveBeenNthCalledWith(2, '/project-tasks/task-1/publish', { expectedUpdatedAt: 'version' }, undefined)
    expect(client.get).toHaveBeenNthCalledWith(3, '/project-tasks/task-1/teams', undefined)
    expect(client.get).toHaveBeenNthCalledWith(4, '/project-tasks/task-1/monitoring', undefined)
  })
})
