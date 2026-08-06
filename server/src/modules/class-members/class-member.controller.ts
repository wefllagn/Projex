import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { joinClassSchema } from '../classes/class.schemas.js'
import {
  classMemberParamsSchema,
  classRosterParamsSchema,
  classRosterQuerySchema,
  updateClassMemberSchema,
} from './class-member.schemas.js'
import type { ClassMemberService } from './class-member.service.js'

export function createClassMemberController(service: ClassMemberService) {
  return {
    join: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classCode } = parseRequest(joinClassSchema, request.body)
        const result = await service.join(request.auth!.user, classCode)
        response
          .status(result.created ? 201 : 200)
          .json(successResponse(result, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classRosterParamsSchema, request.params)
        const query = parseRequest(classRosterQuerySchema, request.query)
        const result = await service.list(request.auth!.user, classId, query)
        response
          .status(200)
          .json(
            listResponse(
              result.members,
              result.pagination,
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    update: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId, memberId } = parseRequest(
          classMemberParamsSchema,
          request.params,
        )
        const input = parseRequest(updateClassMemberSchema, request.body)
        const member = await service.update(
          request.auth!.user,
          classId,
          memberId,
          input,
          request.requestId,
        )
        response.status(200).json(successResponse(member, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
