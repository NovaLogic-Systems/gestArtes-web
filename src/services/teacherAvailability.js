/**
 * @file src/services/teacherAvailability.js
 * Minimal frontend service for teacher availability submissions
 */

import api from './api'

export async function fetchTeacherAvailability() {
  const res = await api.get('/teacher/availability', { skipAuthHandler: true })
  return res.data
}

export async function submitTeacherAvailability(payload) {
  const res = await api.post('/teacher/availability/submit', payload)
  return res.data
}

export async function reportTeacherAbsence({ startDateTime, endDateTime, reason }) {
  const res = await api.post('/teacher/availability/exceptions', {
    startDate: startDateTime,
    endDate: endDateTime,
    reason,
  })
  return res.data
}

export async function fetchTeacherCalendar() {
  const res = await api.get('/teacher/calendar')
  return res.data
}

export async function fetchAbsenceDetails(teacherId, opts = {}) {
  // Best-effort: try to query pending exceptions and return the first matching entry.
  try {
    const res = await api.get('/teacher/availability/exceptions/pending', {
      params: { teacherId, ...opts },
    })

    const data = res?.data
    if (!data || !Array.isArray(data.exceptions)) return null

    // If caller provided a date/start time, try to match by overlap
    if (opts && opts.start) {
      const start = new Date(opts.start)
      for (const ex of data.exceptions) {
        if (!ex.startDate || !ex.endDate) continue
        const s = new Date(ex.startDate)
        const e = new Date(ex.endDate)
        if (start >= s && start <= e) return ex
      }
    }

    return data.exceptions[0] ?? null
  } catch {
    return null
  }
}
