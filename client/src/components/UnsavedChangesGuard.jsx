import { useContext, useEffect } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom'
import AppDialog from './AppDialog.jsx'
function RouteGuard({ dirty, bypass }) {
  const blocker = useBlocker(() => dirty && !bypass?.current)
  if (blocker.state !== 'blocked') return null
  return <AppDialog title="Leave unsaved changes?" onClose={() => blocker.reset()}><p>Your changes are still on this page. Stay to save them, or discard them and leave.</p><footer><button type="button" className="student-primary-action" onClick={() => blocker.reset()}>Stay</button><button type="button" className="student-outline-action" onClick={() => blocker.proceed()}>Discard and leave</button></footer></AppDialog>
}
export default function UnsavedChangesGuard({ dirty, bypass }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)
  useEffect(() => {
    const beforeUnload = event => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  return dataRouter ? <RouteGuard dirty={dirty} bypass={bypass} /> : null
}
