import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import notificationService, { formatNotificationDate, invalidateNotificationCache, resolveNotificationLink } from '../services/notificationService'
import { subscribeToNotifications } from '../services/realtimeNotifications'
import Toast from './ui/Toast'
import RoleSwitcher from './RoleSwitcher'

function BellGlyph({ unreadCount }) {
  return (
    <span className="notifications-bell-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 22a2.7 2.7 0 0 0 2.63-2h-5.26A2.7 2.7 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.25-6.78V3a1.75 1.75 0 0 0-3.5 0v1.22A7 7 0 0 0 5 11v5l-1.3 1.3A1 1 0 0 0 4.41 19h15.18a1 1 0 0 0 .71-1.7L19 16Zm-2 .59.41.41H6.59L7 16.59V11a5 5 0 0 1 10 0v5.59Z" />
      </svg>
      {unreadCount > 0 ? <strong className="notifications-count-badge">{unreadCount}</strong> : null}
    </span>
  )
}

const getActionUrl = resolveNotificationLink

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

export default function NotificationsBell({
  pageLink = '/student/notifications',
  onClick,
  count,
  children = 'Notificações',
  ...buttonProps
}) {
  const navigate = useNavigate()
  const controlledByParent = typeof onClick === 'function'
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [toastNotif, setToastNotif] = useState(null)
  const rootRef = useRef(null)

  const displayCount = typeof count === 'number' ? count : unreadCount
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
    if (!controlledByParent) {
      void loadPreview()
    }
  }, [controlledByParent, loadPreview])

  useEffect(() => {
    if (controlledByParent) {
      return undefined
    }

    return subscribeToNotifications((notification) => {
      invalidateNotificationCache()
      setNotifications((current) => {
        if (!shouldReplaceNotification(current, notification)) {
          return current
        }

        if (!notification.isRead) {
          setUnreadCount((count) => count + 1)
        }

        setToastNotif(notification)
        return [notification, ...current.filter((item) => item.id !== notification.id)]
      })
      setLoaded(true)
    })
  }, [controlledByParent])

  useEffect(() => {
    if (!open || controlledByParent) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [controlledByParent, open])

  const handleOpen = (event) => {
    if (controlledByParent) {
      onClick(event)
      return
    }

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

  const handleDismiss = async (notificationId) => {
    const previous = notifications

    setNotifications((current) => current.filter((item) => item.id !== notificationId))

    try {
      await notificationService.remove(notificationId)
    } catch {
      setNotifications(previous)
      setError('Nao foi possivel remover a notificacao.')
    }
  }

  return (
    <div className="notifications-root" ref={rootRef} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <RoleSwitcher />
      <button
        type="button"
        className="pill notifications-pill"
        onClick={handleOpen}
        aria-expanded={controlledByParent ? undefined : open}
        aria-label={`Notificacoes, ${displayCount} por ler`}
        {...buttonProps}
      >
        <span>{children}</span>
        <BellGlyph unreadCount={displayCount} />
      </button>

      {!controlledByParent && open ? (
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
                  <div className="notifications-item-row">
                    <div
                      className="notifications-item-content"
                      onClick={() => {
                        handleMarkAsRead(notification)
                        navigate(getActionUrl(notification, pageLink))
                        setOpen(false)
                      }}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      <span className={`notifications-type-badge notifications-type-${notification.type}`}>
                        {notification.type === 'coaching' ? '🎓' :
                         notification.type === 'marketplace' ? '🛒' :
                         notification.type === 'schedule' ? '📅' :
                         notification.type === 'join_request' ? '📋' :
                         notification.type === 'penalty' ? '⚠️' :
                         notification.type === 'inventory' ? '📦' :
                         notification.type === 'account' ? '👤' : '🔔'}
                      </span>
                      <div className="notifications-item-text">
                        <strong>{notification.title}</strong>
                        {notification.message ? <p>{notification.message}</p> : null}
                        <small>{formatNotificationDate(notification.createdAt)}</small>
                      </div>
                    </div>
                    <div className="notifications-item-actions">
                      {!notification.isRead && (
                        <button
                          type="button"
                          className="notifications-mark-read-btn"
                          aria-label="Marcar como lida"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification)
                          }}
                          title="Marcar como lida"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        type="button"
                        className="notifications-dismiss-btn"
                        aria-label="Dispensar notificação"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(notification.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            className="notifications-more-link"
            onClick={() => { setOpen(false); navigate(pageLink) }}
          >
            Ver Mais
          </button>
        </div>
      ) : null}

      {toastNotif ? (
        <Toast
          variant="info"
          title={toastNotif.title}
          description={toastNotif.message || undefined}
          actionLabel="Ver"
          onAction={() => { navigate(getActionUrl(toastNotif, pageLink)); setToastNotif(null) }}
          onClose={() => setToastNotif(null)}
          style={{ position: 'fixed', bottom: '18px', right: '18px', zIndex: 9999 }}
        />
      ) : null}
    </div>
  )
}
