import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AcademicFields from './AcademicFields.jsx'
import { classOfferingLabel } from './class-links.js'

describe('Class academic controls', () => {
  it('offers only the three supported terms and consecutive academic years', () => {
    render(<AcademicFields />)
    expect([...screen.getByLabelText('Semester / Term').options].map((option) => option.value)).toEqual(['', 'First Semester', 'Second Semester', 'Short Term'])
    const years = [...screen.getByLabelText('Academic year').options].map((option) => option.value).filter(Boolean)
    expect(years).toHaveLength(7)
    expect(years.every((year) => Number(year.slice(5)) === Number(year.slice(0, 4)) + 1)).toBe(true)
    expect(screen.getByLabelText('Academic year')).toBeRequired()
    expect(screen.getByLabelText('Semester / Term')).toBeRequired()
  })
  it('keeps saved legacy values visible without classifying the Class', () => {
    render(<AcademicFields semester="Legacy term" schoolYear="2038-2039" legacy />)
    expect(screen.getByLabelText('Semester / Term')).toHaveValue('Legacy term')
    expect(screen.getByLabelText('Academic year')).toHaveValue('2038-2039')
    expect(classOfferingLabel({})).toBe('Class')
  })
})
