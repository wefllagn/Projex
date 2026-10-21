import { useLayoutEffect } from 'react'

export function useOriginDocument(title) {
  useLayoutEffect(() => {
    const previousTitle = document.title
    const icon = document.querySelector('link[rel="icon"]')
    const previousIcon = icon?.getAttribute('href')
    const previousType = icon?.getAttribute('type')
    document.title = title
    if (!window.location.hash && window.scrollY !== 0) window.scrollTo(0, 0)
    icon?.setAttribute('href', '/assets/origin/origin-mark.svg')
    icon?.setAttribute('type', 'image/svg+xml')
    return () => {
      document.title = previousTitle
      if (icon) {
        if (previousIcon !== null) icon.setAttribute('href', previousIcon)
        else icon.removeAttribute('href')
        if (previousType !== null) icon.setAttribute('type', previousType)
        else icon.removeAttribute('type')
      }
    }
  }, [title])
}
