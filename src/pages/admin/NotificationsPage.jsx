import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from './AdminShell'
import notificationService, { formatNotificationDate, invalidateNotificationCache, resolveNotificationLink } from '../../services/notificationService'
import { subscribeToNotifications } from '../../services/realtimeNotifications'
import './NotificationsPage.css'

function shouldReplaceNotification(current, incoming) {
  if (!incoming) {
    return false
  }

  if (!incoming.id) {
    return true
  }

  const existingIndex = current.findIndex((item) => item.id === incoming.id)
  if (existingIndex === -1) {
    return true
  }

  const existing = current[existingIndex]
  return existing.isRead !== incoming.isRead || existing.title !== incoming.title || existing.message !== incoming.message || existing.createdAt !== incoming.createdAt || existingIndex !== 0
}

const FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Coaching', value: 'coaching' },
  { label: 'Adesões', value: 'join_request' },
  { label: 'Agenda', value: 'schedule' },
  { label: 'Inventário', value: 'inventory' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Conta', value: 'account' },
  { label: 'Sistema', value: 'system' },
]

export default function AdminNotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setNotifications(await notificationService.list())
    } catch {
      setError('Não foi possível carregar as notificações.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    return subscribeToNotifications((notification) => {
      invalidateNotificationCache()
      setNotifications((current) => {
        if (!shouldReplaceNotification(current, notification)) {
          return current
        }

        return [notification, ...current.filter((item) => item.id !== notification.id)]
      })
    })
  }, [])

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications
    }

    return notifications.filter((notification) => notification.type === activeFilter)
  }, [activeFilter, notifications])

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) {
      return
    }

    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    )

    try {
      await notificationService.markAsRead(notification.id)
    } catch {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)),
      )
      setError('Não foi possível marcar a notificação como lida.')
    }
  }

  const handleDelete = async (notification) => {
    const previous = notifications
    setNotifications((current) => current.filter((item) => item.id !== notification.id))

    try {
      await notificationService.remove(notification.id)
    } catch {
      setNotifications(previous)
      setError('Não foi possível apagar a notificação.')
    }
  }

  const handleNotificationClick = (notification) => {
    void handleMarkAsRead(notification)
    const target = resolveNotificationLink(notification, '/admin/notifications')
    if (target && target !== '/admin/notifications') {
      navigate(target)
    }
  }

  return (
    <AdminShell
      title="Notificações"
      subtitle="Alertas de coaching, sistema e marketplace"
      activePath="/admin/notifications"
    >
      <section className="content-grid admin-notifications-page">
        {error ? (
          <div className="error-banner" role="alert">
            {error}
            <button className="pill" type="button" onClick={loadNotifications}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        <article className="panel notifications-panel">
          <div className="notifications-page-header">
            <div>
              <h3>Centro de notificacoes</h3>
              <p>{filteredNotifications.length} notificacoes nesta vista</p>
            </div>

            <div className="notification-filter" aria-label="Filtrar notificacoes">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={activeFilter === filter.value ? 'active' : ''}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? <p className="empty">A carregar notificacoes...</p> : null}

          {!loading && filteredNotifications.length === 0 ? (
            <p className="empty">Sem notificacoes para este filtro.</p>
          ) : null}

          {!loading && filteredNotifications.length > 0 ? (
            <ul className="notification-page-list">
              {filteredNotifications.map((notification) => (
                <li key={notification.id} className={notification.isRead ? '' : 'unread'}>
                  <button
                    type="button"
                    className="notification-main"
                    onClick={() => handleNotificationClick(notification)}
                    title="Abrir página relacionada"
                  >
                    <span className="notification-type">{notification.typeLabel}</span>
                    <strong>{notification.title}</strong>
                    {notification.message ? <p>{notification.message}</p> : null}
                    <small>{formatNotificationDate(notification.createdAt)}</small>
                  </button>

                  <button type="button" className="notification-delete" onClick={() => handleDelete(notification)}>
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </AdminShell>
  )
}
