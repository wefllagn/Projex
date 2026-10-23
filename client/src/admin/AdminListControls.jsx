import { useEffect, useState } from 'react'

export function AdminSearch({ initialValue, onSearch, label = 'Search', placeholder, maxLength = 200 }) {
  const [draft, setDraft] = useState({ base: initialValue, value: initialValue })
  if (draft.base !== initialValue) setDraft({ base: initialValue, value: draft.value.trim() === initialValue ? draft.value : initialValue })
  const value = draft.value
  useEffect(() => {
    if (value.trim() === initialValue) return
    const timer = setTimeout(() => onSearch(value.trim()), 350)
    return () => clearTimeout(timer)
  }, [initialValue, onSearch, value])
  return <label className="admin-filter-search">{label}<input type="search" name="search" autoComplete="off" maxLength={maxLength} value={value} onChange={(event) => setDraft({ base: initialValue, value: event.target.value })} placeholder={placeholder} /></label>
}

export function AdminPagination({ pagination, page, onPage, noun = 'records' }) {
  if (!pagination || (!pagination.totalItems && page <= 1)) return null
  const pages = Math.max(1, pagination.totalPages)
  return <nav className="admin-pagination" aria-label={`${noun} pages`}>
    <span>{pages > 1 || page > 1 ? `Page ${page} of ${pages} · ` : ''}{pagination.totalItems} {pagination.totalItems === 1 ? noun.replace(/s$/, '') : noun}</span>
    {pages > 1 || page > 1 ? <div>
      <button type="button" className="student-outline-action" disabled={!pagination.hasPreviousPage} onClick={() => onPage(page - 1)}>Previous</button>
      <button type="button" className="student-outline-action" disabled={!pagination.hasNextPage} onClick={() => onPage(page + 1)}>Next</button>
    </div> : null}
  </nav>
}
