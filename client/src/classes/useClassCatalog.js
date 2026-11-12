import { useCallback, useEffect, useRef, useState } from 'react'

const PAGE_SIZE = 100

export default function useClassCatalog(api, classStatus) {
  const [catalog, setCatalog] = useState({
    status: 'loading',
    classes: [],
    pagination: null,
    error: null,
  })
  const request = useRef(null)

  const loadPage = useCallback(async (page) => {
    if (page === 1) request.current?.abort()
    else if (request.current) return

    const controller = new AbortController()
    request.current = controller
    try {
      const response = await api.listClasses(
        { status: classStatus, page, pageSize: PAGE_SIZE },
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return

      const records = response.data.filter((item) => item.status === classStatus)
      setCatalog((current) => {
        const classes = new Map(page === 1 ? [] : current.classes.map((item) => [item.id, item]))
        for (const record of records) classes.set(record.id, record)
        return { status: 'ready', classes: [...classes.values()], pagination: response.pagination, error: null }
      })
    } catch (error) {
      if (!controller.signal.aborted && error?.name !== 'AbortError') {
        setCatalog((current) => ({ ...current, status: 'error', error }))
      }
    } finally {
      if (request.current === controller) request.current = null
    }
  }, [api, classStatus])

  const refreshClasses = useCallback(() => loadPage(1), [loadPage])

  useEffect(() => {
    refreshClasses()
    return () => request.current?.abort()
  }, [refreshClasses])

  const loadMore = useCallback(() => {
    if (catalog.pagination?.hasNextPage) return loadPage(catalog.pagination.page + 1)
  }, [catalog.pagination, loadPage])

  const updateClass = useCallback((record, { lifecycleChanged = false } = {}) => {
    setCatalog((current) => {
      const existing = current.classes.some((item) => item.id === record.id)
      let classes = current.classes
      if (record.status !== classStatus) classes = classes.filter((item) => item.id !== record.id)
      else if (existing) classes = classes.map((item) => item.id === record.id ? record : item)
      else classes = [record, ...classes]

      // A status change shifts the server's offsets. Restart from page one.
      return { ...current, classes, pagination: lifecycleChanged ? null : current.pagination }
    })
    if (lifecycleChanged) refreshClasses()
  }, [classStatus, refreshClasses])

  return { ...catalog, refreshClasses, loadMore, updateClass }
}
