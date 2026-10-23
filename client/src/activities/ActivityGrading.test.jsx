import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import ActivityGrading from './ActivityGrading.jsx'

function Harness({ frozen = false }) {
  const [form, setForm] = useState({ gradingMode: 'GRADED', totalPoints: 100, gradingPeriod: 'PRELIM', rubricCriteria: [] })
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
