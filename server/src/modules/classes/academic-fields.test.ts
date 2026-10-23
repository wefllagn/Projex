import { describe, expect, it } from 'vitest'
import { createClassSchema, updateClassSchema } from './class.schemas.js'

describe('standard Class academic fields', () => {
  const input = { program: 'INFORMATION_TECHNOLOGY', className: 'Programming', section: '9123A', semester: 'First Semester', schoolYear: '2026-2027' }
  it.each([undefined, '', '   '])('requires the Class Code for a normal new Class: %s', (section) => {
    expect(createClassSchema.safeParse({ ...input, section }).success).toBe(false)
  })
  it.each(['First Semester', 'Second Semester', 'Short Term'])('accepts %s without a Course or approval field', (semester) => {
    expect(createClassSchema.parse({ ...input, semester })).toMatchObject({ ...input, semester })
  })
  it.each(['First', 'first semester', 'Summer', 'THIRD_SEMESTER'])('rejects unsupported term %s', (semester) => {
    expect(createClassSchema.safeParse({ ...input, semester }).success).toBe(false)
  })
  it.each(['2026', '2026-2028', '2026/2027', 'twenty twenty six'])('rejects malformed year %s', (schoolYear) => {
    expect(createClassSchema.safeParse({ ...input, schoolYear }).success).toBe(false)
  })
  it('requires an explicit Program for a new Class', () => {
    const withoutProgram = { ...input, program: undefined }
    expect(createClassSchema.safeParse(withoutProgram).success).toBe(false)
    expect(updateClassSchema.parse({ room: 'B-204' })).toEqual({ room: 'B-204' })
  })
  it('requires term and academic year on creation but does not rewrite legacy records on unrelated edits', () => {
    expect(createClassSchema.safeParse({ className: 'Programming' }).success).toBe(false)
    expect(updateClassSchema.parse({ room: 'A-201' })).toEqual({ room: 'A-201' })
    expect(updateClassSchema.safeParse({ semester: 'arbitrary' }).success).toBe(false)
  })
  it('retains the existing official metadata contract without adding Short Term to its enum', () => {
    const legacy = { program: input.program, className: input.className, schoolYear: input.schoolYear }
    expect(createClassSchema.safeParse({ ...legacy, academicPeriod: 'FIRST_SEMESTER', officialClassCode: 'A1', courseId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }).success).toBe(true)
  })
})
