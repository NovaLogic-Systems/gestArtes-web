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

export async function getTeacherCoachingAvailability({ teacherId, modalityId, weekStart }) {
  const response = await api.get('/coaching/teacher-availability', {
    params: { teacherId, modalityId, weekStart },
  })
  return response.data
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

export async function reviewRequestAsTeacher(requestId, payload) {
  const response = await api.patch(`/coaching/requests/${requestId}/teacher-review`, payload)
  return response.data?.request
}

export async function listTeacherCoachingRequests() {
  const response = await api.get('/coaching/requests/teacher')
  return response.data?.requests ?? []
}

export async function listAdminCoachingRequests() {
  const response = await api.get('/coaching/requests/admin')
  return response.data?.requests ?? []
}

export async function reviewRequestAsAdmin(requestId, payload) {
  const response = await api.patch(`/coaching/requests/${requestId}/admin-review`, payload)
  return response.data?.request
}

export async function getCompatibleStudiosForRequest(requestId) {
  const response = await api.get(`/coaching/requests/${requestId}/compatible-studios`)
  return response.data?.studios ?? []
}

// --- Group coaching proposals ---
export async function searchStudentsForGroup(query) {
  const response = await api.get('/coaching/students/search', { params: { q: query } })
  return response.data?.students ?? []
}

export async function createGroupProposal(payload) {
  const response = await api.post('/coaching/group-proposals', payload)
  return response.data?.proposal
}

export async function listTeacherGroupProposals() {
  const response = await api.get('/coaching/group-proposals/teacher')
  return response.data?.proposals ?? []
}

export async function listAdminGroupProposals() {
  const response = await api.get('/coaching/group-proposals/admin')
  return response.data?.proposals ?? []
}

export async function getCompatibleStudiosForGroupProposal(proposalId) {
  const response = await api.get(`/coaching/group-proposals/${proposalId}/compatible-studios`)
  return response.data?.studios ?? []
}

export async function reviewGroupProposalAsAdmin(proposalId, payload) {
  const response = await api.patch(`/coaching/group-proposals/${proposalId}/admin-review`, payload)
  return response.data?.proposal
}
