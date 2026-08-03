import { z } from 'zod'
import { isValidClassCode, normalizeClassCode } from './class-code.js'

const classNameSchema = z.string().trim().min(1).max(200)
const sectionSchema = z.string().trim().min(1).max(100)
const semesterSchema = z.string().trim().min(1).max(100)
const schoolYearSchema = z.string().trim().min(1).max(20)

export const classIdParamsSchema = z.object({ classId: z.uuid() }).strict()

export const createClassSchema = z
  .object({
    className: classNameSchema,
    section: sectionSchema,
    semester: semesterSchema,
    schoolYear: schoolYearSchema,
    instructorId: z.uuid().optional(),
  })
  .strict()

export const updateClassSchema = z
  .object({
    className: classNameSchema.optional(),
    section: sectionSchema.optional(),
    semester: semesterSchema.optional(),
    schoolYear: schoolYearSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one class field is required.',
  })

export const classListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  })
  .strict()

export const joinClassSchema = z
  .object({
    classCode: z
      .string()
      .transform(normalizeClassCode)
      .refine(isValidClassCode, 'Class code is invalid.'),
  })
  .strict()

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type ClassListQuery = z.infer<typeof classListQuerySchema>
