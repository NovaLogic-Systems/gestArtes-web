import api from './api'

export async function getAvailableSlots({ weekStart, teacherId, modalityId } = {}) {
  const params = {}
  if (weekStart) params.weekStart = weekStart
  if (teacherId) params.teacherId = teacherId
  if (modalityId) params.modalityId = modalityId

  const response = await api.get('/coaching/slots', { params })
  return response.data
}

export async function getCompatibleStudios(modalityId) {
  const response = await api.get('/studios/compatible', { params: { modalityId } })
  return response.data.studios ?? []
}

export async function createBooking(data) {
  const response = await api.post('/coaching/bookings', data)
  return response.data.session
}

export async function cancelBooking(sessionId, justification) {
  const response = await api.patch(`/coaching/bookings/${sessionId}`, { justification })
  return response.data
}

export async function confirmCompletion(sessionId) {
  const response = await api.patch(`/coaching/sessions/${sessionId}/confirm-completion`)
  return response.data
}

export async function getSessionHistory() {
  const response = await api.get('/coaching/sessions/history')
  return response.data.sessions ?? []
}
