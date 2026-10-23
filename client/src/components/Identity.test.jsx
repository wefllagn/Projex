import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UserAvatar from './UserAvatar.jsx'
import ClassIdentityBadge from '../classes/ClassIdentityBadge.jsx'
describe('Origin identities', () => {
  it('uses the same Class initial and shared badge in every size', () => {
    const {container}=render(<>{['student-class-dot','student-course-avatar','academic-classroom-avatar'].map(className=><ClassIdentityBadge key={className} className={className} classRecord={{className:'Computer Programming'}} />)}</>)
    for(const badge of container.querySelectorAll('.origin-identity-badge')) expect(badge).toHaveTextContent('C')
  })
  it('keeps neutral illustration colors fixed in both themes and never infers gender', () => {
    const {container,rerender}=render(<div data-theme="light"><UserAvatar /></div>)
    expect(container.querySelector('[data-avatar]')).toHaveAttribute('data-avatar','neutral')
    const colors=()=>[...container.querySelectorAll('svg [fill]')].map(n=>n.getAttribute('fill'))
    const before=colors();rerender(<div data-theme="dark"><UserAvatar /></div>)
    expect(colors()).toEqual(before)
    expect(before).toContain('#ead9bd')
  })
  it.each(['male','female'])('uses a local SVG only when %s is explicitly selected', variant => {
    const {container}=render(<UserAvatar variant={variant} />)
    expect(container.querySelector('img')).toHaveAttribute('src',`/assets/origin/avatars/${variant}.svg`)
  })
})
