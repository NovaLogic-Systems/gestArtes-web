import { io } from 'socket.io-client'
import { getAccessToken } from './tokenStore'
import { mapNotification } from './notificationService'

const listeners = new Set()

let sharedSocket = null
let sharedSocketToken = null
let visibilityListenerAttached = false

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    return window.location.origin
  }

  return String(apiUrl).replace(/\/api\/?$/, '').replace(/\/+$/, '')
}

function disconnectSocket() {
  if (!sharedSocket) {
    return
  }

  sharedSocket.off('notification')
  sharedSocket.disconnect()
  sharedSocket = null
  sharedSocketToken = null
}

function emitNotification(notification) {
  for (const listener of listeners) {
    try {
      listener(notification)
    } catch {
      // Ignore listener failures so one subscriber does not break the rest.
    }
  }
}

function ensureSocket() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return null
  }

  const accessToken = getAccessToken()
  if (!accessToken) {
    return null
  }

  if (sharedSocket && sharedSocketToken === accessToken) {
    return sharedSocket
  }

  disconnectSocket()

  sharedSocketToken = accessToken
  sharedSocket = io(getSocketUrl(), {
    auth: { accessToken },
    transports: ['websocket'],
    withCredentials: true,
  })

  sharedSocket.on('notification', (data) => {
    emitNotification(mapNotification(data))
  })

  return sharedSocket
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') {
    return
  }

  if (document.visibilityState === 'hidden') {
    disconnectSocket()
    return
  }

  if (listeners.size > 0) {
    ensureSocket()
  }
}

export function subscribeToNotifications(onNotification) {
  if (typeof onNotification !== 'function') {
    return () => {}
  }

  listeners.add(onNotification)

  if (typeof document !== 'undefined' && !visibilityListenerAttached) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = true
  }

  ensureSocket()

  return () => {
    listeners.delete(onNotification)

    if (listeners.size > 0) {
      return
    }

    disconnectSocket()

    if (visibilityListenerAttached && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      visibilityListenerAttached = false
    }
  }
}
