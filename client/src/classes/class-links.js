export function classHref(path, classId) {
  if (!classId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}classId=${encodeURIComponent(classId)}`
}

export function classInitial(classRecord) {
  return classRecord?.className?.trim().charAt(0).toUpperCase() || 'C'
}

export function firstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] || 'there'
}
