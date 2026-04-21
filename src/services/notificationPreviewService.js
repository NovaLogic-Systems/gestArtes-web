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
  async getPreview({ limit = 4, includeUnreadCount = true } = {}) {
    try {
      const response = await api.get('/notifications', {
        params: {
          limit,
          includeUnreadCount,
        },
      })

      const rawNotifications = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.notifications)
          ? response.data.notifications
          : Array.isArray(response.data?.items)
            ? response.data.items
            : []

      const notifications = rawNotifications.map(mapNotification)
      const mappedUnreadCount = notifications.reduce(
        (total, current) => total + (current.isRead ? 0 : 1),
        0,
      )

      const responseUnreadCount = Number(response.data?.unreadCount)
      const unreadCount = Number.isFinite(responseUnreadCount) && responseUnreadCount >= 0
        ? responseUnreadCount
        : mappedUnreadCount

      const items = Number.isInteger(limit) && limit >= 0 ? notifications.slice(0, limit) : notifications

      return {
        items,
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
