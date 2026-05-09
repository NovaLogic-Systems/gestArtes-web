import api from './api';

export async function fetchPendingBookings() {
  const { data } = await api.get('/admin/validations/pending-approval');
  return data;
}

export async function fetchPendingFinalizations() {
  const { data } = await api.get('/admin/validations/post-session');
  return data;
}

export async function fetchPendingJoinRequests() {
  const { data } = await api.get('/admin/coachingjoin-requests/pending');
  return data;
}

export async function approveBooking(id) {
  const { data } = await api.patch(`/admin/validations/${id}/approve`);
  return data;
}

export async function rejectBooking(id, reason) {
  const { data } = await api.patch(`/admin/validations/${id}/reject`, { reason });
  return data;
}

export async function approveJoinRequest(id) {
  const { data } = await api.patch(`/admin/coachingjoin-requests/${id}/approve`);
  return data;
}

export async function finalizeValidation(id) {
  const { data } = await api.patch(`/admin/sessions/${id}/finalize-validation`);
  return data;
}
