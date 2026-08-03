import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  classIdParamsSchema,
  classListQuerySchema,
  createClassSchema,
  updateClassSchema,
} from './class.schemas.js'
import type { ClassService } from './class.service.js'

export function createClassController(service: ClassService) {
  return {
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(createClassSchema, request.body)
        const classRecord = await service.create(request.auth!.user, input)
        response.status(201).json(successResponse(classRecord, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = parseRequest(classListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, query)
        response
          .status(200)
          .json(
            listResponse(
              result.classes,
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
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const classRecord = await service.get(request.auth!.user, classId)
        response.status(200).json(successResponse(classRecord, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    update: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const input = parseRequest(updateClassSchema, request.body)
        const classRecord = await service.update(
          request.auth!.user,
          classId,
          input,
        )
        response.status(200).json(successResponse(classRecord, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    archive: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const classRecord = await service.archive(request.auth!.user, classId)
        response.status(200).json(successResponse(classRecord, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    restore: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const classRecord = await service.restore(request.auth!.user, classId)
        response.status(200).json(successResponse(classRecord, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    getJoinCode: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const code = await service.getJoinCode(request.auth!.user, classId)
        response.status(200).json(successResponse(code, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    rotateJoinCode: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const code = await service.rotateJoinCode(request.auth!.user, classId)
        response.status(200).json(successResponse(code, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    revokeJoinCode: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { classId } = parseRequest(classIdParamsSchema, request.params)
        const code = await service.revokeJoinCode(request.auth!.user, classId)
        response.status(200).json(successResponse(code, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
