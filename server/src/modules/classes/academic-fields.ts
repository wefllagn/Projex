import { z } from 'zod'

// Use the existing semester text column. SHORT TERM must not be coerced into
// the legacy two-value official-offering enum or require a schema migration.
export const semesterSchema = z.enum(['First Semester', 'Second Semester', 'Short Term'])
export const schoolYearSchema = z.string().trim().regex(/^\d{4}-\d{4}$/, 'Select an academic year.')
  .refine((value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1, 'Select consecutive academic years.')
