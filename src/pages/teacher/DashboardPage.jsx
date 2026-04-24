import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import QuickActions from '../../components/QuickActions'
import Toast from '../../components/ui/Toast'
import './DashboardPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Pedidos de admissão', href: '/teacher/admission-requests' },
]

function toInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeKpis(data) {
  return {
    classesToday: toInteger(data?.classesToday ?? data?.ClassesToday),
    pendingConfirmations: toInteger(data?.pendingConfirmations ?? data?.PendingConfirmations),
    admissionRequests: toInteger(data?.admissionRequests ?? data?.AdmissionRequests),
    noShows: toInteger(data?.noShows ?? data?.NoShows),
  }
}

function normalizeScheduleRow(item) {
  return {
    sessionId: toInteger(item?.sessionId ?? item?.SessionId),
    time: String(item?.time ?? item?.Time ?? '').slice(0, 5) || '—',
    studio: String(item?.studio ?? item?.Studio ?? item?.studioName ?? '—'),
    status: String(item?.status ?? item?.Status ?? item?.sessionStatus ?? ''),
    studentCount: toInteger(item?.studentCount ?? item?.StudentCount),
  }
}

function normalizeSchedule(data) {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.schedule)
      ? data.schedule
      : []
  return rows.map(normalizeScheduleRow)
}

function normalizeJoinRequest(item) {
  return {
    joinRequestId: toInteger(item?.joinRequestId ?? item?.JoinRequestID ?? item?.id),
    studentName: String(item?.studentName ?? item?.StudentName ?? 'Estudante').trim(),
    sessionLabel: String(item?.sessionLabel ?? item?.SessionLabel ?? `Sessão #${toInteger(item?.sessionId ?? item?.SessionId)}`).trim(),
  }
}

function normalizeJoinRequests(data) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.requests)
      ? data.requests
      : Array.isArray(data?.items)
        ? data.items
        : []
  return items.map(normalizeJoinRequest)
}

function resolveStatusBadgeClass(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s.includes('conclu') || s.includes('complet') || s.includes('finaliz')) return 'badge ok'
  if (s.includes('curso') || s.includes('progress') || s.includes('ativ')) return 'badge warn'
  if (s.includes('cancel') || s.includes('reject')) return 'badge danger'
  return 'badge info'
}

function resolveStatusLabel(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'Agendada'
  if (s.includes('conclu') || s.includes('complet') || s.includes('finaliz')) return 'Concluída'
  if (s.includes('curso') || s.includes('progress') || s.includes('ativ')) return 'Em curso'
  if (s.includes('agendad') || s.includes('schedul')) return 'Agendada'
  if (s.includes('pend')) return 'Pendente'
  if (s.includes('cancel')) return 'Cancelada'
  return status
}

function formatNotificationDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function DashboardPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'

  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [kpis, setKpis] = useState({ classesToday: 0, pendingConfirmations: 0, admissionRequests: 0, noShows: 0 })
  const [schedule, setSchedule] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationBoxRef = useRef(null)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((v) => !v)
      return
    }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')

    const [dashboardResult, scheduleResult, requestsResult] = await Promise.allSettled([
      api.get('/teacher/dashboard'),
      api.get('/teacher/schedule/today'),
      api.get('/teacher/admission-requests'),
    ])

    if (dashboardResult.status === 'fulfilled') {
      setKpis(normalizeKpis(dashboardResult.value.data))
    } else {
      setError('Não foi possível carregar o resumo do painel.')
    }

    if (scheduleResult.status === 'fulfilled') {
      setSchedule(normalizeSchedule(scheduleResult.value.data))
    }

    if (requestsResult.status === 'fulfilled') {
      setJoinRequests(normalizeJoinRequests(requestsResult.value.data))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const loadNotificationPreview = useCallback(async () => {
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items ?? [])
      setUnreadCount(preview.unreadCount ?? 0)
      setNotificationsLoaded(true)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return undefined

    const handleOutsideClick = (event) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notificationsOpen])

  const handleNotificationsClick = () => {
    const nextState = !notificationsOpen
    setNotificationsOpen(nextState)
    if (nextState && !notificationsLoaded) {
      void loadNotificationPreview()
    }
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const quickActions = [
    {
      key: 'availability',
      label: 'Submeter disponibilidade',
      onClick: () => showToast('Funcionalidade em breve disponível.'),
    },
    {
      key: 'completion',
      label: 'Confirmar conclusão',
      onClick: () => showToast('Funcionalidade em breve disponível.'),
    },
    {
      key: 'no-show',
      label: 'Registar falta sem aviso',
      variant: 'ctaSecondary',
      onClick: () => showToast('Funcionalidade em breve disponível.'),
    },
  ]

  return (
    <div className="teacher-dashboard">
      {toast ? (
        <div className="toast-wrapper">
          <Toast variant="info" title={toast} onClose={() => setToast(null)} />
        </div>
      ) : null}

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
                  onClick={handleMobileNavClick}
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
                navigate('/login?reason=logged-out', { replace: true })
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
                aria-label={sidebarToggleLabel}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <button
                className="menu-toggle"
                type="button"
                id="menuToggle"
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
                onClick={() => setMobileOpen((v) => !v)}
              >
                ☰ Menu
              </button>
              <h2>Painel Professor</h2>
              <p>Operação diária de aulas, faltas e pedidos de adesão</p>
            </div>
            <div className="topbar-right" ref={notificationBoxRef}>
              <Link className="pill" to="/teacher/account">
                Minha Conta
              </Link>
              <button type="button" className="pill notifications-pill" onClick={handleNotificationsClick}>
                {`Notificações${unreadCount > 0 ? ` ${unreadCount}` : ''}`}
              </button>

              {notificationsOpen ? (
                <div className="notifications-popover">
                  <div className="notifications-popover-header">
                    <strong>Notificações</strong>
                  </div>

                  {notificationsLoading ? (
                    <p className="notifications-state">A carregar...</p>
                  ) : null}

                  {!notificationsLoading && notificationsError ? (
                    <p className="notifications-state error">{notificationsError}</p>
                  ) : null}

                  {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                    <p className="notifications-state">Sem notificações.</p>
                  ) : null}

                  {!notificationsLoading && notifications.length > 0 ? (
                    <ul className="notifications-list">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="notifications-item">
                          <strong>{notification.title}</strong>
                          {notification.message ? <p>{notification.message}</p> : null}
                          <small>{formatNotificationDate(notification.createdAt)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <Link
                    to="/teacher/notifications"
                    className="notifications-more-link"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Ver Mais
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <section className="content-grid">
            {error ? (
              <div className="error-banner">
                {error}
                <button className="pill" style={{ marginLeft: '0.65rem' }} type="button" onClick={loadAll}>
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className="kpi-grid">
              <article className="kpi">
                <h3>Aulas hoje</h3>
                <strong>{loading ? '—' : kpis.classesToday}</strong>
              </article>
              <article className="kpi">
                <h3>Confirmações pendentes</h3>
                <strong>{loading ? '—' : kpis.pendingConfirmations}</strong>
              </article>
              <article className="kpi">
                <h3>Pedidos de adesão</h3>
                <strong>{loading ? '—' : kpis.admissionRequests}</strong>
              </article>
              <article className="kpi">
                <h3>Faltas sem aviso</h3>
                <strong>{loading ? '—' : kpis.noShows}</strong>
              </article>
            </div>

            <div className="split">
              <article className="panel">
                <h3>Agenda de hoje</h3>

                {loading ? (
                  <p className="panel-subtle">A carregar sessões...</p>
                ) : schedule.length === 0 ? (
                  <p className="empty">Sem sessões agendadas para hoje.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Sessão</th>
                        <th>Estúdio</th>
                        <th>Alunos</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr key={row.sessionId}>
                          <td>{row.time}</td>
                          <td>#{row.sessionId}</td>
                          <td>{row.studio}</td>
                          <td>{row.studentCount}</td>
                          <td>
                            <span className={resolveStatusBadgeClass(row.status)}>
                              {resolveStatusLabel(row.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>

              <article className="panel">
                <h3>Ações rápidas</h3>
                <QuickActions actions={quickActions} />

                <h3 style={{ marginTop: '1.25rem' }}>Pedidos de adesão em fila</h3>

                {loading ? (
                  <p className="panel-subtle">A carregar pedidos...</p>
                ) : joinRequests.length === 0 ? (
                  <p className="empty">Sem pedidos pendentes.</p>
                ) : (
                  <>
                    <ul className="join-requests-list">
                      {joinRequests.slice(0, 5).map((request) => (
                        <li key={request.joinRequestId} className="join-request-item">
                          <strong>#{request.joinRequestId} · {request.sessionLabel}</strong>
                          <span>{request.studentName}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="join-requests-footer">
                      <Link to="/teacher/admission-requests">
                        Ver todos ({joinRequests.length})
                      </Link>
                    </div>
                  </>
                )}
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
