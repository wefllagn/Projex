import { useCallback, useEffect, useRef, useState } from 'react'
import AppDialog from './AppDialog.jsx'
// Confirmation stays in the application, so cancel, focus and keyboard behavior
// are consistent across browsers. It never repeats the consequential action.
export default function useConfirmation() {
  const pending = useRef(null)
  const [question, setQuestion] = useState(null)
  const confirm = useCallback((message, title = 'Confirm action') => new Promise(resolve => {
    if (pending.current) { resolve(false); return }
    pending.current = resolve
    setQuestion({ message, title })
  }), [])
  const finish = useCallback(accepted => {
    const resolve = pending.current
    pending.current = null
    setQuestion(null)
    resolve?.(accepted)
  }, [])
  useEffect(() => () => { pending.current?.(false); pending.current = null }, [])
  return [confirm, question && <AppDialog title={question.title} onClose={() => finish(false)}><p>{question.message}</p><footer><button type="button" className="student-outline-action" onClick={() => finish(false)}>Cancel</button><button type="button" className="student-primary-action" onClick={() => finish(true)}>Confirm</button></footer></AppDialog>]
}
