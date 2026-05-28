/**
 * @file src/services/coaching.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

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

export async function requestJoinSession(sessionId) {
  const response = await api.post(`/coaching/sessions/${sessionId}/join-requests`, {})
  return response.data
}

export async function cancelBooking(sessionId, justification) {
  const response = await api.patch(`/coaching/bookings/${sessionId}`, { justification })
  return response.data
}

export async function confirmCompletion(sessionId) {
  const response = await api.patch(`/coaching/sessions/${sessionId}/confirm-completion`)
  return response.data
}

let historyCache = null;
let historyCacheTime = 0;
const CACHE_DURATION = 5000;

export async function getSessionHistory() {
  if (historyCache && Date.now() - historyCacheTime < CACHE_DURATION) {
    return historyCache;
  }
  const response = await api.get('/coaching/sessions/history')
  historyCache = response.data.sessions ?? []
  historyCacheTime = Date.now()
  return historyCache
}

export async function listCoachingModalities() {
  const response = await api.get('/coaching/modalities')
  return response.data?.modalities ?? []
}

export async function listCoachingTeachersByModality(modalityId) {
  const response = await api.get('/coaching/teachers', {
    params: { modalityId },
  })
  return response.data?.teachers ?? []
}

export async function createCoachingRequest(payload) {
  const response = await api.post('/coaching/requests', payload)
  return response.data?.request
}

export async function listMyCoachingRequests() {
  const response = await api.get('/coaching/requests/my')
  return response.data?.requests ?? []
}

export async function getCoachingRequestById(requestId) {
  const response = await api.get(`/coaching/requests/${requestId}`)
  return response.data?.request
}

export async function respondToTeacherSuggestion(requestId, payload) {
  const response = await api.patch(`/coaching/requests/${requestId}/student-review`, payload)
  return response.data?.request
}
