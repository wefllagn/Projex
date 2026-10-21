import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OriginLandingPage from './OriginLandingPage.jsx'

afterEach(() => localStorage.removeItem('origin-public-theme'))

function renderLanding() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<OriginLandingPage />} />
        <Route
          path="/student-login"
          element={<h1>Existing student login</h1>}
        />
        <Route
          path="/instructor-login"
          element={<h1>Existing instructor login</h1>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Origin public landing page', () => {
  it('supports arrow-key tab navigation and keeps focus with the selected panel', async () => {
    renderLanding()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Programming' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Repositories' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Repositories' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByRole('tabpanel', { name: 'Repositories' }),
    ).toHaveTextContent('programming-fundamentals')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Assessment' })).toHaveFocus()
    expect(
      screen.getByRole('tabpanel', { name: 'Assessment' }),
    ).toHaveTextContent('Automated checking')
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'Run demo' })).toBeInTheDocument()
  })

  it('opens the repository preview from the progress section', async () => {
    renderLanding()
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Explore repositories' }))
    expect(
      screen.getByRole('tabpanel', { name: 'Repositories' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['For Students', 'Existing student login'],
    ['For Instructors', 'Existing instructor login'],
  ])(
    'keeps the %s card connected to the existing login route',
    async (role, destination) => {
      renderLanding()
      const card = screen
        .getAllByRole('link', { name: new RegExp(role) })
        .find((link) => link.classList.contains('origin-role-card'))
      await userEvent.setup().click(card)
      expect(
        screen.getByRole('heading', { name: destination }),
      ).toBeInTheDocument()
    },
  )

  it('persists public appearance and synchronizes its controls', async () => {
    const { container } = renderLanding()
    const controls = screen.getAllByRole('button', {
      name: 'Light appearance',
    })
    await userEvent.setup().click(controls[0])
    controls.forEach((control) =>
      expect(control).toHaveAttribute('aria-pressed', 'true'),
    )
    expect(container.querySelector('.origin-landing')).toHaveAttribute(
      'data-theme',
      'light',
    )
    expect(localStorage.getItem('origin-public-theme')).toBe('light')
  })

  it('runs a local greeting demonstration and preserves its result across tabs', async () => {
    renderLanding()
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Greeting name'))
    await user.type(screen.getByLabelText('Greeting name'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Run demo' }))
    expect(screen.getByRole('button', { name: 'Running…' })).toBeDisabled()
    expect(await screen.findByText('Hello, Ada!')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Repositories' }))
    await user.click(screen.getByRole('tab', { name: 'Programming' }))
    expect(screen.getByLabelText('Greeting name')).toHaveValue('Ada')
    expect(screen.getByText('Hello, Ada!')).toBeInTheDocument()
  })

  it('lets visitors inspect repository files and commit details', async () => {
    renderLanding()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Repositories' }))
    const panel = within(screen.getByRole('tabpanel'))
    await user.click(panel.getByRole('button', { name: 'README.md' }))
    expect(
      panel.getByText('A demonstration repository for Java activities.'),
    ).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: 'History' }))
    await user.click(panel.getByRole('button', { name: /Improve loop logic/ }))
    expect(
      panel.getByText('Keep iteration logic clear and easy to inspect.'),
    ).toBeInTheDocument()
  })

  it('keeps fictional instructor feedback local and preserves it between submissions', async () => {
    renderLanding()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Assessment' }))
    const panel = within(screen.getByRole('tabpanel'))
    await user.click(panel.getByRole('button', { name: 'Feedback' }))
    await user.clear(panel.getByLabelText('Instructor feedback'))
    await user.type(
      panel.getByLabelText('Instructor feedback'),
      'A clear solution.',
    )
    await user.click(panel.getByRole('button', { name: 'Save demo feedback' }))
    expect(panel.getByRole('status')).toHaveTextContent(
      'Feedback saved in this demo.',
    )
    await user.click(panel.getByRole('button', { name: /Sam Chen/ }))
    await user.click(panel.getByRole('button', { name: /Alex Rivera/ }))
    expect(panel.getByLabelText('Instructor feedback')).toHaveValue(
      'A clear solution.',
    )
  })

  it('lets manual exploration interrupt guided playback without resetting the selected experience', () => {
    vi.useFakeTimers()
    try {
      renderLanding()
      fireEvent.click(screen.getByRole('button', { name: 'Play walkthrough' }))
      fireEvent.click(screen.getByRole('tab', { name: 'Repositories' }))
      act(() => vi.advanceTimersByTime(2000))
      expect(
        screen.getByRole('tabpanel', { name: 'Repositories' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Repositories' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
