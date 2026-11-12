import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '../api/api-client.js'
import { createClassApi } from './class-api.js'
import { ClassContext } from './class-context.js'
import useClassCatalog from './useClassCatalog.js'

export default function ClassProvider({ children, client = apiClient }) {
  const { search } = useLocation()
  const api = useMemo(() => createClassApi(client), [client])
  const { updateClass, ...catalog } = useClassCatalog(api, 'ACTIVE')
  const [detail, setDetail] = useState({ id: null, classRecord: null, error: null })

  const requestedClassId = new URLSearchParams(search).get('classId')
  const catalogSelection = catalog.classes.find((item) => item.id === requestedClassId) ?? null
  useEffect(() => {
    if (!requestedClassId || catalogSelection || catalog.status === 'loading') return undefined
    const controller = new AbortController()
    api.getClass(requestedClassId, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setDetail({ id: requestedClassId, classRecord: response.data, error: null })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error?.name !== 'AbortError') {
          setDetail({ id: requestedClassId, classRecord: null, error })
        }
      })
    return () => controller.abort()
  }, [api, catalog.status, catalogSelection, requestedClassId])

  const selectedClass = catalogSelection
    ?? (detail.id === requestedClassId ? detail.classRecord : null)
  const selectionError = detail.id === requestedClassId ? detail.error : null
  let selectionStatus = 'none'
  if (requestedClassId) {
    selectionStatus = selectedClass ? 'ready' : selectionError ? 'error' : 'loading'
  }

  function upsertClass(classRecord, options) {
    updateClass(classRecord, options)
    setDetail((current) => (
      current.id === classRecord.id || requestedClassId === classRecord.id
        ? { id: classRecord.id, classRecord, error: null }
        : current
    ))
  }

  const value = {
    api,
    ...catalog,
    selectedClass,
    requestedClassId,
    selectionStatus,
    selectionError,
    upsertClass,
  }

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
}
