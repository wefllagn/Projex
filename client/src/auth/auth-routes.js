export const ROLE_HOME = {
  STUDENT: '/student',
  INSTRUCTOR: '/instructor',
  ADMIN: '/admin',
}

export function roleHome(role) {
  return ROLE_HOME[role] ?? '/'
}

export function roleMatchesPath(role, pathname) {
  const home = roleHome(role)
  return home !== '/' && (pathname === home || pathname.startsWith(`${home}/`))
}
