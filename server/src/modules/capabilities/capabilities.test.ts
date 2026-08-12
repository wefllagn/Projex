import pino from 'pino'
import request from 'supertest'
import { Router } from 'express'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createCapabilitiesRouter } from './capabilities.routes.js'
import { createCapabilitiesService } from './capabilities.service.js'

describe('public runtime capabilities', () => {
  it('returns only the allowlisted effective capability contract', async () => {
    const router = createCapabilitiesRouter(createCapabilitiesService({ profile: 'HOSTED_SAFE', java: { execution: false }, git: { provisioning: false, inspection: false, smartHttp: false } }))
    const empty = Router()
    const response = await request(createApp({ config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' }, databaseHealth: { checkConnection: async () => undefined }, logger: pino({ level: 'silent' }), featureRouters: { capabilities: router, auth: empty, accountSetup: empty, users: empty, classes: empty, activities: empty, submissions: empty } })).get('/api/v1/capabilities').expect(200)
    expect(response.body.data).toEqual({ profile: 'HOSTED_SAFE', java: { execution: false }, git: { provisioning: false, inspection: false, smartHttp: false } })
    for (const field of ['path', 'executable', 'mode', 'secret', 'host', 'limits']) expect(response.body.data).not.toHaveProperty(field)
  })
})
