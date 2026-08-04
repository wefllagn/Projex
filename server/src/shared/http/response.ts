export interface ResponseMeta {
  requestId: string
  idempotentReplay?: boolean
}

export interface SuccessResponse<T> {
  data: T
  meta: ResponseMeta
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ListResponse<T> {
  data: T[]
  pagination: PaginationMeta
  meta: ResponseMeta
}

export interface ErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ErrorResponse {
  error: ErrorBody
  meta: ResponseMeta
}

export function successResponse<T>(
  data: T,
  requestId: string,
  meta?: Omit<ResponseMeta, 'requestId'>,
): SuccessResponse<T> {
  return {
    data,
    meta: { requestId, ...meta },
  }
}

export function listResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  requestId: string,
): ListResponse<T> {
  return {
    data,
    pagination,
    meta: { requestId },
  }
}

export function errorResponse(
  error: ErrorBody,
  requestId: string,
): ErrorResponse {
  return {
    error,
    meta: { requestId },
  }
}
