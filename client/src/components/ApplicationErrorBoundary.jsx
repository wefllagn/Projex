import { Component, useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import RecoveryScreen from './RecoveryScreen.jsx'

function report(error) {
  // Diagnostics stay in the developer console, never in recovery copy or forms.
  console.error('Origin view failed', import.meta.env.DEV ? { name: error?.name, stack: error?.stack } : { event: 'origin.render_failure' })
}
export class ApplicationErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { report(error) }
  render() {
    return this.state.failed ? <RecoveryScreen title="This page couldn’t continue" message="Something interrupted this page. You can try again or return to a safe place in Origin." actions={<><button type="button" className="student-primary-action" onClick={() => this.setState({ failed: false })}>Try again</button><a className="student-outline-action" href="/">Back to Origin</a></>} /> : this.props.children
  }
}
export function RouteErrorRecovery() {
  const error = useRouteError()
  useEffect(() => report(error), [error])
  return <RecoveryScreen title="This page couldn’t continue" message="Something interrupted this page. You can try again or return to a safe place in Origin." actions={<><button type="button" className="student-primary-action" onClick={() => window.location.reload()}>Try again</button><a className="student-outline-action" href="/">Back to Origin</a></>} />
}
export function UnavailablePage() {
  return <RecoveryScreen title="This page isn’t available" message="The link may have changed, or the page may no longer be available. You can return to Origin and choose your workspace." actions={<a className="student-primary-action" href="/">Back to Origin</a>} />
}
