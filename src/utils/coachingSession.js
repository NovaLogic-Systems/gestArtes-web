function normalizeSessionStatus(status) {
  return String(status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function isSessionJoinable(sessionStatus) {
  const status = normalizeSessionStatus(sessionStatus)

  if (!status) {
    return false
  }

  const blockedMarkers = ['finaliz', 'validat', 'conclu', 'complete', 'finish', 'closed', 'cancel', 'reject', 'archiv', 'end']
  if (blockedMarkers.some((marker) => status.includes(marker))) {
    return false
  }

  return status === 'approved' || status.includes('pending') || status.includes('aprov') || status.includes('schedul') || status.includes('agend')
}

export function canJoinSession({ sessionStatus, sessionStartTime, sessionEndTime, userIsEnrolled = false, hasSpots = false }) {
  if (!hasSpots || userIsEnrolled) {
    return false
  }

  if (!isSessionJoinable(sessionStatus)) {
    return false
  }

  const endTime = sessionEndTime ? new Date(sessionEndTime).getTime() : null
  if (Number.isFinite(endTime) && endTime <= Date.now()) {
    return false
  }

  if (!sessionStartTime) {
    return true
  }

  const startTime = new Date(sessionStartTime).getTime()
  if (Number.isFinite(startTime) && startTime <= Date.now()) {
    return false
  }

  return true
}
