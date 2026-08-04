import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  activitySubmissionParamsSchema,
  createPracticeRunSchema,
  createSubmissionSchema,
  failureResolutionSchema,
  idempotencyKeySchema,
  practiceRunParamsSchema,
  reviewSubmissionSchema,
  scoreCorrectionSchema,
  submissionListQuerySchema,
  submissionParamsSchema,
  submissionTransitionSchema,
} from './submission.schemas.js'
import type { SubmissionService } from './submission.service.js'

export function createSubmissionController(service: SubmissionService) {
  return {
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(
          activitySubmissionParamsSchema,
          request.params,
        )
        const input = parseRequest(createSubmissionSchema, request.body)
        const idempotencyKey = parseRequest(
          idempotencyKeySchema,
          request.header('Idempotency-Key'),
        )
        const result = await service.create(
          request.auth!.user,
          activityId,
          input.sourceCode,
          idempotencyKey,
        )
        response
          .status(result.idempotentReplay ? 200 : 201)
          .json(
            successResponse(result.submission, request.requestId, {
              idempotentReplay: result.idempotentReplay,
            }),
          )
      } catch (error) {
        next(error)
      }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(
          activitySubmissionParamsSchema,
          request.params,
        )
        const query = parseRequest(submissionListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, activityId, query)
        response
          .status(200)
          .json(
            listResponse(
              result.submissions,
              result.pagination,
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        response
          .status(200)
          .json(
            successResponse(
              await service.get(request.auth!.user, submissionId),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    correctScore: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        const input = parseRequest(scoreCorrectionSchema, request.body)
        response
          .status(201)
          .json(
            successResponse(
              await service.correctScore(
                request.auth!.user,
                submissionId,
                input,
              ),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    review: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        const input = parseRequest(reviewSubmissionSchema, request.body)
        response
          .status(200)
          .json(
            successResponse(
              await service.review(request.auth!.user, submissionId, input),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    release: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        const input = parseRequest(submissionTransitionSchema, request.body)
        response
          .status(200)
          .json(
            successResponse(
              await service.release(request.auth!.user, submissionId, input),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    retry: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        const input = parseRequest(submissionTransitionSchema, request.body)
        response
          .status(202)
          .json(
            successResponse(
              await service.retry(request.auth!.user, submissionId, input),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    resolveFailure: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { submissionId } = parseRequest(
          submissionParamsSchema,
          request.params,
        )
        const input = parseRequest(failureResolutionSchema, request.body)
        response
          .status(200)
          .json(
            successResponse(
              await service.resolveFailure(
                request.auth!.user,
                submissionId,
                input,
              ),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    createPractice: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { activityId } = parseRequest(
          activitySubmissionParamsSchema,
          request.params,
        )
        const input = parseRequest(createPracticeRunSchema, request.body)
        response
          .status(202)
          .json(
            successResponse(
              await service.createPracticeRun(
                request.auth!.user,
                activityId,
                input.sourceCode,
              ),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    getPractice: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { runId } = parseRequest(practiceRunParamsSchema, request.params)
        response
          .status(200)
          .json(
            successResponse(
              await service.getPracticeRun(request.auth!.user, runId),
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
  }
}
