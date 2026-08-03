import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  replaceTestCasesSchema,
  testCaseActivityParamsSchema,
  testCaseListQuerySchema,
} from './test-case.schemas.js'
import type { TestCaseService } from './test-case.service.js'

export function createTestCaseController(service: TestCaseService) {
  return {
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(
          testCaseActivityParamsSchema,
          request.params,
        )
        const query = parseRequest(testCaseListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, activityId, query)
        response
          .status(200)
          .json(
            listResponse(result.testCases, result.pagination, request.requestId),
          )
      } catch (error) {
        next(error)
      }
    },
    replace: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(
          testCaseActivityParamsSchema,
          request.params,
        )
        const input = parseRequest(replaceTestCasesSchema, request.body)
        const result = await service.replace(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
