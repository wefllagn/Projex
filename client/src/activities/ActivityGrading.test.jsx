import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import ActivityGrading from './ActivityGrading.jsx'
import { DEFAULT_GRADING_CONFIGURATION } from './weighted-grading.js'

function Harness({ frozen = false, weighted = false }) {
  const [form, setForm] = useState({ gradingMode: 'GRADED', totalPoints: 100, gradingPeriod: 'PRELIM', rubricCriteria: [], gradingConfiguration: weighted ? DEFAULT_GRADING_CONFIGURATION : null })
  return <ActivityGrading form={form} automatedPoints={70} frozen={frozen} onChange={(key, value) => setForm(previous => ({ ...previous, [key]: value }))} />
}

describe('Activity grading allocation', () => {
  it('explains the test allocation and requires all remaining Instructor points', async () => {
    render(<Harness />)
    expect(screen.getByText(/Automated tests: 70 · Available Instructor points: 30/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Allocate all available Instructor points')
    await userEvent.click(screen.getByRole('button', { name: 'Add rubric criterion' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Criterion name' }), 'Readability')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Criterion maximum' }), '30')
    expect(screen.getByRole('status')).toHaveTextContent('Allocation matches available Instructor points')
  })

  it('keeps published grading controls frozen', () => {
    render(<Harness frozen />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Add rubric criterion' })).not.toBeInTheDocument()
  })
})


describe('built-in rubric defaults', () => {
  it('provides the four allocations automatically without a rubric designer', async () => {
    render(<Harness weighted />)
    expect(screen.getByRole('spinbutton', { name: /Correctness allocation/ })).toHaveValue(70)
    expect(screen.getByRole('spinbutton', { name: /Readability allocation/ })).toHaveValue(15)
    expect(screen.getByRole('spinbutton', { name: /Organization allocation/ })).toHaveValue(10)
    expect(screen.getByRole('spinbutton', { name: /Documentation allocation/ })).toHaveValue(5)
    expect(screen.queryByRole('button', { name: 'Add rubric criterion' })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('spinbutton', { name: /Correctness allocation/ }))
    await userEvent.type(screen.getByRole('spinbutton', { name: /Correctness allocation/ }), '65')
    expect(screen.getByRole('status')).toHaveTextContent('must total 100%')
    await userEvent.clear(screen.getByRole('spinbutton', { name: /Readability allocation/ }))
    await userEvent.type(screen.getByRole('spinbutton', { name: /Readability allocation/ }), '20')
    expect(screen.getByRole('status')).toHaveTextContent('Correctness: 65 · Instructor: 35')
  })
  it('keeps the built-in allocations immutable after publication', () => {
    render(<Harness weighted frozen />)
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled()
  })
})
