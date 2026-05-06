/**
 * @file src/utils/roles.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

export const ROLE_HIERARCHY = Object.freeze({
  student: 1,
  teacher: 2,
  admin: 3,
})

export const ADMIN_ROLE_OPTIONS = Object.freeze([
  { value: 'student', label: 'Aluno' },
  { value: 'teacher', label: 'Professor' },
  { value: 'direction', label: 'Direção' },
])

export const DASHBOARD_PATHS = Object.freeze({
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
})

export function normalizeRole(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function toAppRole(value) {
  const normalized = normalizeRole(value)

  if (normalized === 'student' || normalized === 'teacher' || normalized === 'admin') {
    return normalized
  }

  if (
    normalized.includes('admin')
    || normalized.includes('management')
    || normalized.includes('gest')
    || normalized.includes('direction')
    || normalized.includes('direc')
  ) {
    return 'admin'
  }

  if (normalized.includes('teacher') || normalized.includes('prof')) {
    return 'teacher'
  }

  if (normalized.includes('student') || normalized.includes('aluno')) {
    return 'student'
  }

  return ''
}

export function normalizeRoleList(value) {
  return (Array.isArray(value) ? value : [value]).map((entry) => toAppRole(entry)).filter(Boolean)
}

export function hasRoleAccess(currentRole, allowedRoles = []) {
  const normalizedAllowedRoles = normalizeRoleList(allowedRoles)

  if (!normalizedAllowedRoles.length) {
    return true
  }

  return normalizedAllowedRoles.includes(toAppRole(currentRole))
}

export function getDashboardPath(currentRole) {
  return DASHBOARD_PATHS[toAppRole(currentRole)] ?? DASHBOARD_PATHS.student
}

export function isPathAllowedForRole(currentRole, path) {
  const normalizedRole = toAppRole(currentRole)
  const candidatePath = String(path || '').trim()

  if (!normalizedRole || !candidatePath.startsWith('/')) {
    return false
  }

  const sectionRoot = getDashboardPath(normalizedRole).replace(/\/dashboard$/, '')

  return candidatePath === sectionRoot || candidatePath.startsWith(`${sectionRoot}/`)
}
