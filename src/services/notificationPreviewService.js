import api from './api'

function mapNotification(item) {
  return {
    id: item?.id,
    title: String(item?.title || 'Notificação').trim(),
    message: String(item?.message || '').trim(),
    isRead: Boolean(item?.isRead),
    createdAt: item?.createdAt || null,
  }
}

const notificationPreviewService = {
  async getPreview(limit = 4) {
    try {
      const response = await api.get('/notifications')
      const notifications = Array.isArray(response.data)
        ? response.data.map(mapNotification)
        : []

      const unreadCount = notifications.reduce(
        (total, current) => total + (current.isRead ? 0 : 1),
        0,
      )

      return {
        items: notifications.slice(0, limit),
        unreadCount,
      }
    } catch {
      return {
        items: [],
        unreadCount: 0,
      }
    }
  },
}

export default notificationPreviewService
