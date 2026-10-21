import { useEffect, useState } from 'react'

const THEME_KEY = 'origin-public-theme'

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function useOriginTheme() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    function sync(event) {
      if (event.key === THEME_KEY) setTheme(readTheme())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      return
    }
  }
  return { theme, toggleTheme }
}
