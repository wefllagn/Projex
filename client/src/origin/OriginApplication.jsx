import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from './OriginPrimitives.jsx'
import { useOriginTheme } from './use-origin-theme.js'
import { useOriginDocument } from './use-origin-document.js'

export default function OriginApplication({ role, children }) {
  const { theme, toggleTheme } = useOriginTheme()
  const location = useLocation()
  useOriginDocument(`${role.label} workspace — Origin`)
  useEffect(() => {
    document.documentElement.dataset.originAppearance = theme
    return () => { delete document.documentElement.dataset.originAppearance }
  }, [theme])
  const scope = location.pathname.includes('workspace') ? 'Java workspace'
    : location.pathname.includes('repositor') ? 'Repositories'
      : role.id === 'admin' ? 'Administration' : 'Academic workspace'
  return <div className="origin-application" data-theme={theme}>
    <a className="origin-app-skip" href="#origin-main">Skip to workspace</a>
    <header className="origin-app-bar">
      <div className="origin-app-context"><Icon name={role.id === 'admin' ? 'chart' : 'branch'} /><span>{scope}</span><span aria-hidden="true">/</span><strong>{role.label.replace(' View', '')}</strong></div>
      <div className="origin-app-utilities"><span>Saint Louis University</span><button className="origin-app-theme" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`} onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button></div>
    </header>
    {children}
  </div>
}
