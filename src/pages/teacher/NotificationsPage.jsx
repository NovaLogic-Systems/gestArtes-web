import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import notificationService, { formatNotificationDate, invalidateNotificationCache, resolveNotificationLink } from '../../services/notificationService'
import { subscribeToNotifications } from '../../services/realtimeNotifications'
import '../admin-studios.css'
import './NotificationsPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

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

export default function NotificationsPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((v) => !v)
      return
    }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile
    ? (mobileOpen ? '✕' : '☰')
    : (sidebarCollapsed ? '▶' : '◀')

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
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)])
    })
  }, [])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)

      if (!mobile) {
        setMobileOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    onResize()

    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
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
    const target = resolveNotificationLink(notification, '/teacher/notifications')
    if (target && target !== '/teacher/notifications') {
      navigate(target)
    }
  }

  return (
    <div className="teacher-dashboard teacher-notifications-page">
      <div className={appShellClassName}>
        {isMobile && mobileOpen ? (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Fechar navegação lateral"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
        <aside className={sidebarClassName} id="sidebar">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{teacherName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  to={item.href}
                  onClick={() => {
                    if (isMobile) {
                      setMobileOpen(false)
                    }
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              className="nav-link"
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
            >
              Terminar Sessão
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Notificações</h2>
              </div>
            </div>

            <div className="topbar-right">
              <NotificationsBell pageLink="/teacher/notifications" />
            </div>
          </header>

          <section className="content-grid">
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
                  <h3>Centro de notificações</h3>
                  <p>{filteredNotifications.length} notificações nesta vista</p>
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

              {loading ? <p className="empty">A carregar notificações...</p> : null}

              {!loading && filteredNotifications.length === 0 ? (
                <p className="empty">Sem notificações para este filtro.</p>
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
        </main>
      </div>
    </div>
  )
}

