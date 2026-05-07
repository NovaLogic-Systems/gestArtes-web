import api from './api'

const TYPE_LABELS = {
  coaching: 'Coaching',
  marketplace: 'Marketplace',
  system: 'Sistema',
  schedule: 'Agenda',
  penalty: 'Penalizacao',
  join_request: 'Inscricoes',
}

function inferType(item) {
  const explicitType = String(item?.type || item?.category || '').trim().toLowerCase()
  if (explicitType) {
    return explicitType
  }

  const typeId = Number(item?.typeId ?? item?.TypeID)
  if (typeId === 2) {
    return 'coaching'
  }

  if (typeId === 3) {
    return 'marketplace'
  }

  const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase()
  if (text.includes('coaching') || text.includes('sessao') || text.includes('aula')) {
    return 'coaching'
  }

  if (text.includes('marketplace') || text.includes('anuncio') || text.includes('venda') || text.includes('compra')) {
    return 'marketplace'
  }

  return 'system'
}

export function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function mapNotification(item) {
  const type = inferType(item)

  return {
    id: item?.id,
    title: String(item?.title || 'Notificacao').trim(),
    message: String(item?.message || '').trim(),
    type,
    typeLabel: TYPE_LABELS[type] || 'Sistema',
    isRead: Boolean(item?.isRead),
    createdAt: item?.createdAt || null,
  }
}

function resolveListPayload(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  return []
}

const notificationService = {
  async list() {
    const response = await api.get('/notifications')
    return resolveListPayload(response.data).map(mapNotification)
  },

  async getPreview(limit = 5) {
    const response = await api.get('/notifications', {
      params: { preview: true, limit },
    })
    return resolveListPayload(response.data).map(mapNotification)
  },

  async markAsRead(id) {
    await api.patch(`/notifications/${id}/read`)
  },

  async remove(id) {
    await api.delete(`/notifications/${id}`)
  },
}

export const getNotifications = async () => {
  const items = await notificationService.list()
  return { data: items }
}

export const markAsRead = (id) => notificationService.markAsRead(id)
export const deleteNotification = (id) => notificationService.remove(id)

export default notificationService
