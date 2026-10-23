import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OriginLandingPage from './OriginLandingPage.jsx'

afterEach(() => {
  localStorage.removeItem('origin-public-theme')
  vi.unstubAllGlobals()
})

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
    await user.click(panel.getByRole('button', { name: /Frank Ocean/ }))
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
  it('defaults to dark and links the overview directly to the workspace', () => {
    const { container } = renderLanding()
    expect(container.querySelector('.origin-landing')).toHaveAttribute(
      'data-theme',
      'dark',
    )
    expect(screen.getByRole('link', { name: 'View overview' })).toHaveAttribute(
      'href',
      '#features',
    )
  })

  it.each(['Repositories', 'Assessment'])(
    'plays the %s walkthrough without returning to Programming',
    (name) => {
      vi.useFakeTimers()
      try {
        renderLanding()
        fireEvent.click(screen.getByRole('tab', { name }))
        fireEvent.click(
          screen.getByRole('button', { name: 'Play walkthrough' }),
        )
        act(() => vi.advanceTimersByTime(1600))
        const panel = within(screen.getByRole('tabpanel', { name }))
        if (name === 'Repositories') {
          expect(
            panel.getByRole('button', { name: 'src/ArraysDemo.java' }),
          ).toHaveAttribute('aria-pressed', 'true')
        } else {
          expect(
            panel.getByLabelText('Instructor feedback'),
          ).toBeInTheDocument()
        }
        act(() => vi.advanceTimersByTime(1600))
        expect(screen.getByRole('tab', { name })).toHaveAttribute(
          'aria-selected',
          'true',
        )
        expect(
          screen.getByRole('button', { name: 'Play walkthrough' }),
        ).toBeInTheDocument()
        if (name === 'Repositories') {
          expect(
            panel.getByRole('heading', {
              name: 'Add array implementation',
            }),
          ).toBeInTheDocument()
        } else {
          expect(panel.getByRole('status')).toHaveTextContent(
            'Feedback saved in this demo.',
          )
        }
      } finally {
        vi.useRealTimers()
      }
    },
  )

  it('cancels remaining walkthrough steps when a visitor edits feedback', () => {
    vi.useFakeTimers()
    try {
      renderLanding()
      fireEvent.click(screen.getByRole('tab', { name: 'Assessment' }))
      fireEvent.click(screen.getByRole('button', { name: 'Play walkthrough' }))
      act(() => vi.advanceTimersByTime(1600))
      fireEvent.change(screen.getByLabelText('Instructor feedback'), {
        target: { value: 'My review in progress.' },
      })
      act(() => vi.advanceTimersByTime(5000))
      expect(screen.getByLabelText('Instructor feedback')).toHaveValue(
        'My review in progress.',
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Changes stay in this demonstration.',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([false, true])(
    'autoplays once on visibility unless reduced motion is %s',
    (reduced) => {
      const observers = []
      vi.stubGlobal('matchMedia', () => ({
        matches: reduced,
        addEventListener() {},
        removeEventListener() {},
      }))
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback) {
            this.callback = callback
            observers.push(this)
          }
          observe(target) {
            this.target = target
          }
          disconnect() {}
        },
      )
      vi.useFakeTimers()
      try {
        renderLanding()
        const observer = observers.find((item) =>
          item.target.classList.contains('origin-showcase-toolbar'),
        )
        act(() =>
          observer.callback([{ isIntersecting: true, intersectionRatio: 1 }]),
        )
        if (reduced) {
          expect(
            screen.getByRole('button', { name: 'Play walkthrough' }),
          ).toBeInTheDocument()
        } else {
          expect(
            screen.getByRole('button', { name: 'Stop walkthrough' }),
          ).toBeInTheDocument()
          act(() => vi.advanceTimersByTime(1600))
          act(() => vi.advanceTimersByTime(1600))
          expect(screen.getByText('Hello, Origin!')).toBeInTheDocument()
          act(() =>
            observer.callback([
              { isIntersecting: false, intersectionRatio: 0 },
            ]),
          )
          act(() =>
            observer.callback([{ isIntersecting: true, intersectionRatio: 1 }]),
          )
          expect(
            screen.getByRole('button', { name: 'Play walkthrough' }),
          ).toBeInTheDocument()
        }
      } finally {
        vi.useRealTimers()
      }
    },
  )
})
