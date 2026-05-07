import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import notificationService, { formatNotificationDate } from '../services/notificationService'
import { subscribeToNotifications } from '../services/realtimeNotifications'

export default function NotificationsBell({ pageLink = '/student/notifications' }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const rootRef = useRef(null)

  const previewItems = useMemo(() => notifications.slice(0, 5), [notifications])

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const items = await notificationService.list()
      setNotifications(items)
      setUnreadCount(items.reduce((total, item) => total + (item.isRead ? 0 : 1), 0))
      setLoaded(true)
    } catch {
      setError('Nao foi possivel carregar as notificacoes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  useEffect(() => {
    return subscribeToNotifications((notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)])
      setUnreadCount((current) => current + (notification.isRead ? 0 : 1))
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const handleOpen = () => {
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen && !loaded) {
      void loadPreview()
    }
  }

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) {
      return
    }

    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    )
    setUnreadCount((current) => Math.max(0, current - 1))

    try {
      await notificationService.markAsRead(notification.id)
    } catch {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)),
      )
      setUnreadCount((current) => current + 1)
    }
  }

  return (
    <div className="notifications-root" ref={rootRef}>
      <button
        type="button"
        className="pill notifications-pill"
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={`Notificacoes, ${unreadCount} por ler`}
      >
        <span>Notificações</span>
        <span className="notifications-bell-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M12 22a2.7 2.7 0 0 0 2.63-2h-5.26A2.7 2.7 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.25-6.78V3a1.75 1.75 0 0 0-3.5 0v1.22A7 7 0 0 0 5 11v5l-1.3 1.3A1 1 0 0 0 4.41 19h15.18a1 1 0 0 0 .71-1.7L19 16Zm-2 .59.41.41H6.59L7 16.59V11a5 5 0 0 1 10 0v5.59Z" />
          </svg>
          {unreadCount > 0 ? <strong className="notifications-count-badge">{unreadCount}</strong> : null}
        </span>
      </button>

      {open ? (
        <div className="notifications-popover">
          <div className="notifications-popover-header">
            <strong>Notificações</strong>
          </div>

          {loading ? <p className="notifications-state">A carregar...</p> : null}
          {!loading && error ? <p className="notifications-state error">{error}</p> : null}
          {!loading && !error && previewItems.length === 0 ? (
            <p className="notifications-state">Sem notificações.</p>
          ) : null}

          {!loading && previewItems.length > 0 ? (
            <ul className="notifications-list">
              {previewItems.map((notification) => (
                <li key={notification.id} className={`notifications-item${notification.isRead ? '' : ' unread'}`}>
                  <button type="button" onClick={() => handleMarkAsRead(notification)}>
                    <strong>{notification.title}</strong>
                    {notification.message ? <p>{notification.message}</p> : null}
                    <small>{formatNotificationDate(notification.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Link to={pageLink} className="notifications-more-link" onClick={() => setOpen(false)}>
            Ver Mais
          </Link>
        </div>
      ) : null}
    </div>
  )
}
