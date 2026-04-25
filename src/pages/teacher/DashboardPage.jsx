import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import Badge from '../../components/ui/Badge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Table from '../../components/ui/Table'
import Toast from '../../components/ui/Toast'
import QuickActions from '../../components/QuickActions'
import JoinRequestsTeacherView from '../../components/JoinRequestsTeacherView'
import './DashboardPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Horário', href: '/teacher/schedule' },
  { label: 'Coaching', href: '/teacher/coaching' },
  { label: 'Inventário da Escola', href: '/teacher/inventory' },
  { label: 'Marketplace', href: '/teacher/marketplace' },
  { label: 'Minha Conta', href: '/teacher/account' },
]

function toInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatTime(value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

function formatNotificationDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function resolveSessionStatusVariant(statusName) {
  const s = String(statusName ?? '').toLowerCase()
  if (s.includes('finali') || s.includes('conclu') || s.includes('complet')) return 'success'
  if (
    s.includes('agend') ||
    s.includes('schedul') ||
    s.includes('curso') ||
    s.includes('progress') ||
    s.includes('confirm') ||
    s.includes('pend')
  ) return 'warning'
  return 'neutral'
}

function resolveSessionStatusLabel(statusName) {
  const s = String(statusName ?? '').toLowerCase()
  if (s.includes('finali') || s.includes('conclu') || s.includes('complet')) return 'Concluída'
  if (s.includes('schedul') || s.includes('agend')) return 'Agendada'
  if (s.includes('progress') || s.includes('curso') || s.includes('confirm') || s.includes('pend')) return 'Em curso'
  if (s.includes('no_show') || s.includes('no-show') || s.includes('falta')) return 'Falta s/ aviso'
  if (s.includes('cancel')) return 'Cancelada'
  return statusName || '—'
}

function normalizeSummary(data) {
  return {
    classesToday: toInteger(data?.classesToday),
    pendingConfirmations: toInteger(data?.pendingConfirmations),
    admissionRequests: toInteger(data?.admissionRequests),
    noShows: toInteger(data?.noShows),
  }
}

function normalizeSchedule(data) {
  const rows = Array.isArray(data?.schedule) ? data.schedule : []
  return rows.map((row) => ({
    sessionId: toInteger(row?.sessionId),
    time: row?.time ?? '—',
    studio: String(row?.studio ?? '—').trim() || '—',
    status: String(row?.status ?? '').trim(),
    modalityName: String(row?.modalityName ?? '—').trim() || '—',
  }))
}


const scheduleColumns = [
  {
    key: 'time',
    header: 'Hora',
    render: (row) => <strong>{formatTime(row.time)}</strong>,
  },
  {
    key: 'sessionId',
    header: 'Sessão',
    render: (row) => <span>#{row.sessionId}</span>,
  },
  {
    key: 'modalityName',
    header: 'Formato',
    render: (row) => <span>{row.modalityName}</span>,
  },
  {
    key: 'studio',
    header: 'Estúdio',
    render: (row) => <span>{row.studio}</span>,
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => (
      <Badge variant={resolveSessionStatusVariant(row.status)} size="sm">
        {resolveSessionStatusLabel(row.status)}
      </Badge>
    ),
  },
]

export default function DashboardPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false,
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [summary, setSummary] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  const notificationBoxRef = useRef(null)

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [summaryResult, scheduleResult] = await Promise.allSettled([
      api.get('/teacher/dashboard'),
      api.get('/teacher/schedule/today'),
    ])

    setSummary(summaryResult.status === 'fulfilled' ? normalizeSummary(summaryResult.value.data) : null)
    setSchedule(scheduleResult.status === 'fulfilled' ? normalizeSchedule(scheduleResult.value.data) : [])

    if (summaryResult.status === 'rejected' && scheduleResult.status === 'rejected') {
      setError('Não foi possível carregar os dados do painel. Verifica a ligação ao servidor.')
    }

    setLoading(false)
  }, [])

  const refreshNotificationSummary = useCallback(async () => {
    const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
    setNotificationUnreadCount(preview.unreadCount)
  }, [])

  const loadNotificationPreview = useCallback(async () => {
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items)
      setNotificationUnreadCount(preview.unreadCount)
      setNotificationsLoaded(true)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void refreshNotificationSummary()
  }, [refreshNotificationSummary])

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

  const handleNotificationsClick = useCallback(() => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && !notificationsLoaded) void loadNotificationPreview()
  }, [loadNotificationPreview, notificationsLoaded, notificationsOpen])

  function showComingSoonToast() {
    setToast({ title: 'Em breve', description: 'Funcionalidade em breve disponível.', variant: 'info' })
  }

  return (
    <div className="teacher-dashboard">
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
              <p>{displayName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(`${item.href}/`)
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
              <div className="topbar-heading">
                <button
                  type="button"
                  className="sidebar-toggle-btn"
                  aria-label={sidebarToggleLabel}
                  onClick={handleSidebarToggle}
                >
                  {sidebarToggleSymbol}
                </button>
                <h2>Painel Professor</h2>
              </div>
              <p>Operação diária de aulas, faltas e pedidos de adesão</p>
            </div>

            <div className="topbar-right" ref={notificationBoxRef}>
              <Link className="pill" to="/teacher/account">
                Minha Conta
              </Link>
              <button
                type="button"
                className="notifications-pill"
                onClick={handleNotificationsClick}
              >
                Notificações {notificationUnreadCount > 0 ? notificationUnreadCount : ''}
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
                      {notifications.map((n) => (
                        <li key={n.id} className="notifications-item">
                          <strong>{n.title}</strong>
                          {n.message ? <p>{n.message}</p> : null}
                          <small>{formatNotificationDate(n.createdAt)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <Link
                    to="/notifications"
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
                <button
                  className="pill"
                  style={{ marginLeft: '0.65rem', cursor: 'pointer' }}
                  type="button"
                  onClick={loadData}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className="kpi-grid">
              <article className="kpi">
                <h3>Aulas hoje</h3>
                <strong>{summary ? summary.classesToday : '—'}</strong>
              </article>
              <article className="kpi">
                <h3>Confirmações pendentes</h3>
                <strong>{summary ? summary.pendingConfirmations : '—'}</strong>
              </article>
              <article className="kpi">
                <h3>Pedidos de adesão</h3>
                <strong>{summary ? summary.admissionRequests : '—'}</strong>
              </article>
              <article className="kpi">
                <h3>Faltas sem aviso</h3>
                <strong>{summary ? summary.noShows : '—'}</strong>
              </article>
            </div>

            <div className="split">
              <article className="panel">
                <h3>Agenda de hoje</h3>

                {loading ? (
                  <div className="loading-stack" aria-label="A carregar agenda">
                    <LoadingSkeleton variant="text" lines={1} width="36%" />
                    <LoadingSkeleton variant="block" height="2.5rem" />
                    <LoadingSkeleton variant="block" height="9rem" />
                  </div>
                ) : (
                  <Table
                    columns={scheduleColumns}
                    rows={schedule}
                    getRowKey={(row) => row.sessionId}
                    emptyState="Sem aulas agendadas para hoje."
                    compact
                    striped
                    headBackground="rgba(11, 157, 143, 0.08)"
                    style={{ background: 'transparent', border: 0, boxShadow: 'none' }}
                  />
                )}
              </article>

              <article className="panel">
                <h3>Ações rápidas</h3>
                <p className="panel-subtle">Acesso directo às operações do dia a dia.</p>

                {loading ? (
                  <div className="loading-stack">
                    <LoadingSkeleton variant="block" height="5.5rem" />
                    <LoadingSkeleton variant="block" height="5.5rem" />
                    <LoadingSkeleton variant="block" height="5.5rem" />
                  </div>
                ) : (
                  <QuickActions
                    actions={[
                      {
                        label: 'Submeter disponibilidade',
                        onClick: showComingSoonToast,
                      },
                      {
                        label: 'Confirmar conclusão',
                        onClick: showComingSoonToast,
                      },
                      {
                        label: 'Registar falta sem aviso',
                        onClick: showComingSoonToast,
                        variant: 'ctaSecondary',
                      },
                    ]}
                  />
                )}

                <div className="join-requests-section">
                  <h3>Pedidos de Adesão a Sessões de Coaching</h3>
                  <JoinRequestsTeacherView />
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>

      {toast ? (
        <Toast
          open
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => setToast(null)}
          style={{
            position: 'fixed',
            right: '1.25rem',
            bottom: '1.25rem',
            zIndex: 60,
            background: '#ffffff',
            color: '#1f1c2e',
          }}
        />
      ) : null}
    </div>
  )
}
