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

export async function fetchTeacherCalendar() {
  const res = await api.get('/teacher/calendar')
  return res.data
}
