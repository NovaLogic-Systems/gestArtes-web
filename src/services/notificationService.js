import api from './api'

const TYPE_LABELS = {
  coaching: 'Coaching',
  marketplace: 'Marketplace',
  system: 'Sistema',
  schedule: 'Agenda',
  penalty: 'Penalização',
  join_request: 'Pedidos de adesão',
}

const TYPE_ALIASES = {
  session_approved: 'coaching',
  session_validation_requested: 'coaching',
  join_request_reviewed: 'join_request',
  marketplace_sale: 'marketplace',
  inventory_due_return: 'penalty',
}

const NOTIFICATION_CACHE_TTL_MS = 15000

let notificationListCache = null
let notificationListCacheTime = 0
let notificationListPromise = null
let notificationCacheGeneration = 0

export function invalidateNotificationCache() {
  notificationCacheGeneration += 1
  notificationListCache = null
  notificationListCacheTime = 0
  notificationListPromise = null
}

function inferType(item) {
  const explicitType = String(item?.type || item?.category || '').trim().toLowerCase()
  if (explicitType) {
    return TYPE_ALIASES[explicitType] || explicitType
  }

  const typeId = Number(item?.typeId ?? item?.TypeID)
  if (typeId === 2) {
    return 'coaching'
  }

  if (typeId === 3) {
    return 'marketplace'
  }

  if (typeId === 4) {
    return 'schedule'
  }

  if (typeId === 5) {
    return 'penalty'
  }

  if (typeId === 6) {
    return 'join_request'
  }

  const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase()
  if (text.includes('coaching') || text.includes('sessao') || text.includes('aula')) {
    return 'coaching'
  }

  if (text.includes('marketplace') || text.includes('anuncio') || text.includes('venda') || text.includes('compra')) {
    return 'marketplace'
  }

  if (text.includes('agenda') || text.includes('horario') || text.includes('schedule')) {
    return 'schedule'
  }

  if (text.includes('penal') || text.includes('multa')) {
    return 'penalty'
  }

  if (text.includes('adesao') || text.includes('inscricao') || text.includes('join request')) {
    return 'join_request'
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

function isFreshCache() {
  return Array.isArray(notificationListCache) && (Date.now() - notificationListCacheTime) < NOTIFICATION_CACHE_TTL_MS
}

function cloneNotifications(items) {
  return items.map((item) => ({ ...item }))
}

async function fetchAndCacheNotifications() {
  const requestGeneration = notificationCacheGeneration
  const response = await api.get('/notifications')
  const notifications = resolveListPayload(response.data).map(mapNotification)

  if (requestGeneration === notificationCacheGeneration) {
    notificationListCache = notifications
    notificationListCacheTime = Date.now()
  }

  return notifications
}

const notificationService = {
  async list({ forceRefresh = false } = {}) {
    if (!forceRefresh && isFreshCache()) {
      return cloneNotifications(notificationListCache)
    }

    if (!forceRefresh && notificationListPromise) {
      const items = await notificationListPromise
      return cloneNotifications(items)
    }

    const request = fetchAndCacheNotifications()
    notificationListPromise = request

    try {
      const items = await request
      return cloneNotifications(items)
    } finally {
      if (notificationListPromise === request) {
        notificationListPromise = null
      }
    }
  },

  async getPreview(limit = 5, options = {}) {
    const items = await notificationService.list(options)
    return cloneNotifications(items.slice(0, limit))
  },

  async markAsRead(id) {
    await api.patch(`/notifications/${id}/read`)
    invalidateNotificationCache()
  },

  async remove(id) {
    await api.delete(`/notifications/${id}`)
    invalidateNotificationCache()
  },
}

export const getNotifications = async () => {
  const items = await notificationService.list()
  return { data: items }
}

export const markAsRead = (id) => notificationService.markAsRead(id)
export const deleteNotification = (id) => notificationService.remove(id)

export default notificationService
