import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '../api/api-client.js'
import { createClassApi } from './class-api.js'
import { ClassContext } from './class-context.js'

const FIRST_PAGE = { page: 1, pageSize: 100 }

function mergeClass(records, classRecord) {
  const index = records.findIndex((item) => item.id === classRecord.id)
  if (index === -1) return [classRecord, ...records]
  return records.map((item) => (item.id === classRecord.id ? classRecord : item))
}

export default function ClassProvider({ children, client = apiClient }) {
  const location = useLocation()
  const api = useMemo(() => createClassApi(client), [client])
  const [catalog, setCatalog] = useState({
    status: 'loading',
    classes: [],
    pagination: null,
    error: null,
  })
  const [detail, setDetail] = useState({ id: null, classRecord: null, error: null })

  const requestedClassId = useMemo(
    () => new URLSearchParams(location.search).get('classId'),
    [location.search],
  )

  const loadCatalog = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.listClasses(FIRST_PAGE, { signal })
      setCatalog({
        status: 'ready',
        classes: response.data,
        pagination: response.pagination,
        error: null,
      })
      return response.data
    } catch (error) {
      if (error?.name === 'AbortError') return []
      setCatalog((current) => ({ ...current, status: 'error', error }))
      return []
    }
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    loadCatalog({ signal: controller.signal })
    return () => controller.abort()
  }, [loadCatalog])

  const catalogSelection = catalog.classes.find((item) => item.id === requestedClassId) ?? null

  useEffect(() => {
    if (!requestedClassId || catalogSelection || catalog.status === 'loading') return undefined
    const controller = new AbortController()
    api.getClass(requestedClassId, { signal: controller.signal })
      .then((response) => {
        setDetail({ id: requestedClassId, classRecord: response.data, error: null })
        setCatalog((current) => ({
          ...current,
          classes: mergeClass(current.classes, response.data),
        }))
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setDetail({ id: requestedClassId, classRecord: null, error })
        }
      })
    return () => controller.abort()
  }, [api, catalog.status, catalogSelection, requestedClassId])

  const selectedClass = catalogSelection
    ?? (detail.id === requestedClassId ? detail.classRecord : null)
  const selectionStatus = !requestedClassId
    ? 'none'
    : selectedClass
      ? 'ready'
      : detail.id === requestedClassId && detail.error
        ? 'error'
        : 'loading'
  const selectionError = detail.id === requestedClassId ? detail.error : null

  const upsertClass = useCallback((classRecord) => {
    setCatalog((current) => ({
      ...current,
      classes: mergeClass(current.classes, classRecord),
      pagination: current.pagination
        ? {
            ...current.pagination,
            totalItems: current.classes.some((item) => item.id === classRecord.id)
              ? current.pagination.totalItems
              : current.pagination.totalItems + 1,
          }
        : current.pagination,
    }))
    setDetail((current) => (
      current.id === classRecord.id
        ? { id: classRecord.id, classRecord, error: null }
        : current
    ))
  }, [])

  const loadMore = useCallback(async () => {
    if (!catalog.pagination?.hasNextPage) return
    try {
      const response = await api.listClasses({
        page: catalog.pagination.page + 1,
        pageSize: catalog.pagination.pageSize,
      })
      setCatalog((current) => ({
        status: 'ready',
        classes: response.data.reduce(mergeClass, current.classes),
        pagination: response.pagination,
        error: null,
      }))
    } catch (error) {
      setCatalog((current) => ({ ...current, status: 'error', error }))
    }
  }, [api, catalog.pagination])

  const value = useMemo(() => ({
    api,
    ...catalog,
    selectedClass,
    requestedClassId,
    selectionStatus,
    selectionError,
    refreshClasses: loadCatalog,
    loadMore,
    upsertClass,
  }), [
    api,
    catalog,
    loadCatalog,
    loadMore,
    requestedClassId,
    selectedClass,
    selectionError,
    selectionStatus,
    upsertClass,
  ])

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
}
