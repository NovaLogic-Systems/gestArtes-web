import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import notificationService, { formatNotificationDate, invalidateNotificationCache, resolveNotificationLink } from '../../services/notificationService'
import { subscribeToNotifications } from '../../services/realtimeNotifications'
import './DashboardPage.css'
import './NotificationsPage.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'

const FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Coaching', value: 'coaching' },
  { label: 'Adesões', value: 'join_request' },
  { label: 'Inventário', value: 'inventory' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Conta', value: 'account' },
  { label: 'Sistema', value: 'system' },
]

export default function NotificationsPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : sidebarCollapsed ? '▶' : '◀'
  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

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
    if (!isMobile) {
      return
    }

    setSidebarCollapsed(false)
  }, [isMobile])

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
      return
    }

    setSidebarCollapsed((value) => !value)
  }, [isMobile])

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

  const handleNotificationClick = (notification) => {
    void handleMarkAsRead(notification)
    const target = resolveNotificationLink(notification, '/student/notifications')
    if (target && target !== '/student/notifications') {
      navigate(target)
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
    <div className="student-dashboard student-notifications-page">
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
              <p>{studentName}</p>
            </div>
          </div>

          <nav className="nav-group" aria-label="Navegação do aluno">
            <h2>Aluno</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  to={item.href}
                  aria-current={isActive ? 'page' : undefined}
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
          </nav>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="sidebar-toggle-btn"
                type="button"
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                aria-label={sidebarToggleLabel}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Notificações</h2>
              </div>
            </div>

            <div className="topbar-right">
              <NotificationsBell />
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
