import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import useAutomaticRefresh from '../components/useAutomaticRefresh.js'
import { useClasses } from './class-context.js'
import { StudentClassInvitationPanel } from './ClassInvitationViews.jsx'

const InvitationNotifications = createContext(null)

export function StudentInvitationProvider({ children }) {
  const { api, classes } = useClasses()
  const location = useLocation()
  const [openedRoute, setOpenedRoute] = useState(null)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState({ count: null, status: 'loading' })
  const request = useRef(null)
  const open = openedRoute === location.key
  const refresh = useCallback(() => {
    if (request.current && !request.current.signal.aborted) return
    const controller = new AbortController()
    request.current = controller
    return api.listMyClassInvitations({ page: 1, pageSize: 1 }, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setSummary({ count: response.pagination.totalItems, status: 'ready' }) })
      .catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setSummary(current => ({ ...current, status: 'error' })) })
      .finally(() => { if (request.current === controller) request.current = null })
  }, [api])
  useEffect(() => { refresh(); return () => request.current?.abort() }, [refresh, classes])
  useAutomaticRefresh(refresh, { enabled: !busy })
  const adoptCount = useCallback(count => {
    request.current?.abort(); request.current = null
    setSummary({ count, status: 'ready' })
  }, [])
  const restoreOverlayFocus = useCallback(() => { document.querySelector('[role="dialog"].academic-notifications-dialog')?.focus() }, [])
  return <InvitationNotifications.Provider value={{ count: summary.count, open, show: () => setOpenedRoute(location.key) }}>
    {children}
    {open && <AppDialog title="Notifications" className="academic-notifications-dialog" busy={busy} onClose={() => { if (!busy) setOpenedRoute(null) }}>
      <StudentClassInvitationPanel autoRefresh onPendingChange={adoptCount} onBusyChange={setBusy} onActionSettled={restoreOverlayFocus} />
    </AppDialog>}
  </InvitationNotifications.Provider>
}

export function StudentNotificationMenu({ onOpen }) {
  const notifications = useContext(InvitationNotifications)
  if (!notifications) return null
  const count = notifications.count
  const label = count > 0 ? `Notifications, ${count} pending class ${count === 1 ? 'invitation' : 'invitations'}` : 'Notifications'
  return <div className="student-notification-menu">
    <button type="button" className="academic-notification" aria-label={label} aria-haspopup="dialog" aria-expanded={notifications.open} onClick={() => { onOpen?.(); notifications.show() }}>
      <ProjexIcon name="bell" size={22} />
      {count > 0 && <span className="academic-notification-alert" aria-hidden="true">!</span>}
    </button>
  </div>
}
