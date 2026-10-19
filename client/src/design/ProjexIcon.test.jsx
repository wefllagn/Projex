import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjexIcon } from './ProjexIcon.jsx'

describe('Projex icon semantics', () => {
  it('renders original assets with fixed dimensions and an accessible standalone label', () => {
    render(<ProjexIcon name="repository" size={24} label="Repository" />)
    expect(screen.getByRole('img', { name: 'Repository' })).toHaveAttribute('width', '24')
  })
  it('hides decorative icons next to text and ignores unknown names', () => {
    const { container } = render(<><ProjexIcon name="folder" /><ProjexIcon name="not-in-kit" /><span>Folder</span></>)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
  })
})
