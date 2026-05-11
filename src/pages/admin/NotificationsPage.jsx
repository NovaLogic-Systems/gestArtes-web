import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminShell from './AdminShell'
import notificationService, { formatNotificationDate, invalidateNotificationCache } from '../../services/notificationService'
import { subscribeToNotifications } from '../../services/realtimeNotifications'
import './NotificationsPage.css'

const FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Coaching', value: 'coaching' },
  { label: 'Sistema', value: 'system' },
  { label: 'Marketplace', value: 'marketplace' },
]

export default function AdminNotificationsPage() {
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
      setError('Nao foi possivel carregar as notificacoes.')
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
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)])
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
      setError('Nao foi possivel marcar a notificacao como lida.')
    }
  }

  const handleDelete = async (notification) => {
    const previous = notifications
    setNotifications((current) => current.filter((item) => item.id !== notification.id))

    try {
      await notificationService.remove(notification.id)
    } catch {
      setNotifications(previous)
      setError('Nao foi possivel apagar a notificacao.')
    }
  }

  return (
    <AdminShell
      title="Notificacoes"
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
                  <button type="button" className="notification-main" onClick={() => handleMarkAsRead(notification)}>
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
