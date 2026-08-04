import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  approveRepositorySchema,
  createClassProjectRepositorySchema,
  createFeedbackDraftSchema,
  createInvitationSchema,
  createPersonalRepositorySchema,
  invitationActionSchema,
  memberTransitionSchema,
  projectRepositoryParamsSchema,
  repositoryFeedbackParamsSchema,
  repositoryInvitationParamsSchema,
  repositoryListQuerySchema,
  repositoryMemberParamsSchema,
  repositoryParamsSchema,
  repositoryTransitionSchema,
  requestChangesSchema,
  updateFeedbackDraftSchema,
  updateRepositorySchema,
} from './repository.schemas.js'
import type { RepositoryService } from './repository.service.js'

export function createRepositoryController(service: RepositoryService) {
  return {
    createClassProject: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectRepositoryParamsSchema, request.params)
        const input = parseRequest(createClassProjectRepositorySchema, request.body)
        const result = await service.createClassProject(request.auth!.user, projectTaskId, input)
        response.status(201).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    createPersonal: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(createPersonalRepositorySchema, request.body)
        const result = await service.createPersonal(request.auth!.user, input)
        response.status(201).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = parseRequest(repositoryListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, query)
        response.status(200).json(listResponse(result.repositories, result.pagination, request.requestId))
      } catch (error) { next(error) }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        response.status(200).json(successResponse(await service.get(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
    update: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(updateRepositorySchema, request.body)
        response.status(200).json(successResponse(await service.update(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    readyForReview: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(repositoryTransitionSchema, request.body)
        response.status(200).json(successResponse(await service.readyForReview(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    requestChanges: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(requestChangesSchema, request.body)
        response.status(200).json(successResponse(await service.requestChanges(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    approve: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(approveRepositorySchema, request.body)
        response.status(200).json(successResponse(await service.approve(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    archive: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(repositoryTransitionSchema, request.body)
        response.status(200).json(successResponse(await service.archive(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    restore: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(repositoryTransitionSchema, request.body)
        response.status(200).json(successResponse(await service.restore(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    listMembers: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        response.status(200).json(successResponse(await service.listMembers(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
    transitionMember: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId, memberId } = parseRequest(repositoryMemberParamsSchema, request.params)
        const input = parseRequest(memberTransitionSchema, request.body)
        response.status(200).json(successResponse(await service.transitionMember(request.auth!.user, repositoryId, memberId, input), request.requestId))
      } catch (error) { next(error) }
    },
    createInvitation: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(createInvitationSchema, request.body)
        response.status(201).json(successResponse(await service.createInvitation(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    listRepositoryInvitations: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        response.status(200).json(successResponse(await service.listRepositoryInvitations(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
    listReceivedInvitations: async (request: Request, response: Response, next: NextFunction) => {
      try {
        response.status(200).json(successResponse(await service.listReceivedInvitations(request.auth!.user), request.requestId))
      } catch (error) { next(error) }
    },
    acceptInvitation: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { invitationId } = parseRequest(repositoryInvitationParamsSchema, request.params)
        response.status(200).json(successResponse(await service.acceptInvitation(request.auth!.user, invitationId), request.requestId))
      } catch (error) { next(error) }
    },
    declineInvitation: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { invitationId } = parseRequest(repositoryInvitationParamsSchema, request.params)
        response.status(200).json(successResponse(await service.declineInvitation(request.auth!.user, invitationId), request.requestId))
      } catch (error) { next(error) }
    },
    revokeInvitation: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { invitationId } = parseRequest(repositoryInvitationParamsSchema, request.params)
        const input = parseRequest(invitationActionSchema, request.body)
        response.status(200).json(successResponse(await service.revokeInvitation(request.auth!.user, invitationId, input), request.requestId))
      } catch (error) { next(error) }
    },
    createFeedbackDraft: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        const input = parseRequest(createFeedbackDraftSchema, request.body)
        response.status(201).json(successResponse(await service.createFeedbackDraft(request.auth!.user, repositoryId, input), request.requestId))
      } catch (error) { next(error) }
    },
    updateFeedbackDraft: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { feedbackId } = parseRequest(repositoryFeedbackParamsSchema, request.params)
        const input = parseRequest(updateFeedbackDraftSchema, request.body)
        response.status(200).json(successResponse(await service.updateFeedbackDraft(request.auth!.user, feedbackId, input), request.requestId))
      } catch (error) { next(error) }
    },
    listFeedback: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryParamsSchema, request.params)
        response.status(200).json(successResponse(await service.listFeedback(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
  }
}
