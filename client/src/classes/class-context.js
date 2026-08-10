import { createContext, useContext } from 'react'

export const ClassContext = createContext(null)

export function useClasses() {
  const context = useContext(ClassContext)
  if (!context) throw new Error('useClasses must be used within ClassProvider.')
  return context
}
