import { io } from 'socket.io-client'
import { getAccessToken } from './tokenStore'
import { mapNotification } from './notificationService'

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

export function subscribeToNotifications(onNotification) {
  const accessToken = getAccessToken()

  if (!accessToken || typeof onNotification !== 'function') {
    return () => {}
  }

  const socket = io(getSocketUrl(), {
    auth: { accessToken },
    transports: ['websocket'],
    withCredentials: true,
  })

  socket.on('notification', (data) => {
    onNotification(mapNotification(data))
  })

  return () => {
    socket.off('notification')
    socket.disconnect()
  }
}
