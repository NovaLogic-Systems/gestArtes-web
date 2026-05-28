import api from './api'

export async function listTimetables() {
  const { data } = await api.get('/timetables')
  return Array.isArray(data) ? data : []
}

export function formatMinutes(minutes) {
  const total = Number(minutes)
  if (!Number.isFinite(total)) return '—'
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function dayLabel(dayOfWeek) {
  const normalized = Number(dayOfWeek)
  switch (normalized) {
    case 1: return 'Segunda-feira'
    case 2: return 'Terça-feira'
    case 3: return 'Quarta-feira'
    case 4: return 'Quinta-feira'
    case 5: return 'Sexta-feira'
    case 6: return 'Sábado'
    case 7: return 'Domingo'
    default: return 'Dia'
  }
}

export function sortTimetableSlots(slots = []) {
  return [...slots].sort((a, b) => Number(a?.DayOfWeek ?? 0) - Number(b?.DayOfWeek ?? 0) || Number(a?.StartMinutes ?? 0) - Number(b?.StartMinutes ?? 0))
}
