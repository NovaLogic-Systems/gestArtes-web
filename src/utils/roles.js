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
