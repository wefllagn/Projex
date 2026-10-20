const paths = {
  home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
  createClass: 'M4 4h12v16H4z M8 8h4 M8 12h4 M20 4v8 M16 8h8',
  review: 'M5 3h14v18H5z M8 8l2 2 4-4 M8 15h8',
  classes: 'M3 5h7l2 2h9v13H3z',
  preview: 'M3 4h18v16H3z M7 9h10 M7 14h6',
  teaching: 'M3 3h18v13H3z M8 21l4-5 4 5 M7 7h10 M7 11h6',
  active: 'M4 4h16v16H4z M8 12l3 3 5-6',
  archived: 'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
  createActivity: 'M5 3h10l4 4v14H5z M15 3v5h4 M8 14h8 M12 10v8',
  draft: 'M4 20l4-1L20 7l-4-4L4 15z M13 6l4 4',
  published: 'M4 12l5 5L20 6',
  closed: 'M6 10h12v11H6z M8 10V7a4 4 0 018 0v3',
  expand: 'M6 9l6 6 6-6',
  chevronRight: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12 M18 6L6 18',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  file: 'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5',
  bell: 'M5 16h14l-2-3V8a5 5 0 00-10 0v5z M10 20h4',
  signout: 'M10 4H4v16h6 M9 12h12 M17 8l4 4-4 4',
  avatar: 'M16 7a4 4 0 11-8 0 4 4 0 018 0 M4 21v-3a8 8 0 0116 0v3',
}
export default function ProjexIcon({ name, label, size = 20, className = '' }) {
  return <svg className={`projex-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}><path d={paths[name] || paths.classes} /></svg>
}
// Use only with an actual authorized feed and an actual unread count.
export function NotificationButton({ count = 0, onClick }) {
  return <button type="button" className="projex-notification" aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'} onClick={onClick}><ProjexIcon name="bell" />{count > 0 && <span aria-hidden="true">{count > 99 ? '99+' : count}</span>}</button>
}
