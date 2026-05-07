import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import notificationPreviewService from '../../services/notificationPreviewService'
import { useAuth } from '../../hooks/useAuth'
import KPICard from '../../components/KPICard'
import NotificationsBell from '../../components/NotificationsBell'
import QuickActions from '../../components/QuickActions'
import './DashboardPage.css'
import './NotificationsPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/student/dashboard' },
  { label: 'Coaching', href: '/student/coaching' },
  { label: 'Inventário da Escola', href: '/student/inventory' },
  { label: 'Marketplace', href: '/student/marketplace' },
  { label: 'Perdidos e Achados', href: '/student/lostfound' },
  { label: 'Minha Conta', href: '/student/account' },
]

function formatDateLabel(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function resolveBadgeLabel(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()

  if (!normalized) {
    return 'Agendada'
  }

  if (normalized.includes('approved') || normalized.includes('scheduled') || normalized.includes('confirmed')) {
    return 'Aprovada'
  }

  if (normalized.includes('pend') || normalized.includes('confirm')) {
    return 'A confirmar'
  }

  if (normalized.includes('cancel')) {
    return 'Cancelada'
  }

  return status
}

function resolveBadgeClass(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()

  if (normalized.includes('cancel') || normalized.includes('reject') || normalized.includes('no show')) {
    return 'badge danger'
  }

  if (normalized.includes('pend') || normalized.includes('confirm') || normalized.includes('review')) {
    return 'badge warn'
  }

  return 'badge ok'
}

export default function DashboardPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

  const [dashboard, setDashboard] = useState(null)
  const [schedulePreview, setSchedulePreview] = useState([])
  const [notificationPreview, setNotificationPreview] = useState({ items: [], unreadCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))

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

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const dashboardResult = await Promise.allSettled([
        api.get('/student/dashboard'),
        api.get('/student/schedule/upcoming'),
        notificationPreviewService.getPreview({ limit: 5, includeUnreadCount: true }),
      ])

      const [dashboardPromise, schedulePromise, notificationsPromise] = dashboardResult

      if (dashboardPromise.status === 'fulfilled') {
        setDashboard(dashboardPromise.value.data ?? null)
      } else {
        setDashboard(null)
      }

      if (schedulePromise.status === 'fulfilled') {
        setSchedulePreview(schedulePromise.value.data?.schedule ?? [])
      } else {
        setSchedulePreview([])
      }

      if (notificationsPromise.status === 'fulfilled') {
        setNotificationPreview(notificationsPromise.value)
      } else {
        setNotificationPreview({ items: [], unreadCount: 0 })
      }

      const anyFailed = dashboardResult.some((result) => result.status === 'rejected')
      if (anyFailed) {
        setError('Alguns dados do painel não puderam ser carregados. Tente novamente.')
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível carregar o painel do aluno.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const scheduleRows = useMemo(() => {
    const rows = schedulePreview
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const text = [row.teacher, row.studio, row.status, row.date, row.time].join(' ').toLowerCase()
      return text.includes(term)
    })
  }, [schedulePreview, searchTerm])

  const communicationRows = useMemo(() => {
    return notificationPreview?.items?.slice(0, 3) ?? []
  }, [notificationPreview])

  const quickActions = [
    {
      label: 'Abrir coaching',
      to: '/student/coaching',
      description: 'Consultar sessões e gerir marcações',
    },
    {
      label: 'Inventário da escola',
      to: '/student/inventory',
      description: 'Ver artigos disponíveis para aluguer',
      variant: 'ctaSecondary',
    },
    {
      label: 'Marketplace',
      to: '/student/marketplace',
      description: 'Explorar e gerir compras e vendas',
    },
    {
      label: 'Notificações',
      to: '/student/notifications',
      description: 'Ver alertas e mensagens recentes',
      variant: 'secondary',
    },
  ]

  return (
    <div className="student-dashboard">
      <div className="app-shell">
        <aside className={`sidebar${mobileOpen ? ' open' : ''}`} id="sidebar">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{studentName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Aluno</h2>
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
                className="menu-toggle"
                id="menuToggle"
                type="button"
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
                onClick={() => setMobileOpen((current) => !current)}
              >
                ☰ Menu
              </button>
              <h2>Painel Aluno</h2>
              <p>Visão geral de marcações, validações e comunicações da escola</p>
            </div>
            <div className="topbar-right">
              <input
                className="search"
                type="text"
                placeholder="Pesquisar professor, estúdio ou sessão"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Link className="pill" to="/student/account">
                Minha Conta
              </Link>
              <NotificationsBell />
            </div>
          </header>

          <section className="content-grid">
            {error ? (
              <div className="error-banner">
                {error}
                <button className="pill" style={{ marginLeft: '0.65rem' }} type="button" onClick={loadDashboard}>
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className="kpi-grid">
              <KPICard title="Sessões agendadas" value={dashboard?.upcomingSessions ?? 0} />
              <KPICard title="Validações pendentes" value={dashboard?.pendingValidations ?? 0} />
              <KPICard title="Pedidos em análise" value={dashboard?.reviewRequests ?? 0} />
              <KPICard title="Pagamentos externos em curso" value={dashboard?.externalPaymentsInProgress ?? 0} />
            </div>

            <div className="split">
              <article className="panel">
                <h3>Próximas aulas</h3>

                {loading ? (
                  <p className="panel-subtle">A carregar sessões...</p>
                ) : scheduleRows.length === 0 ? (
                  <p className="empty">Sem sessões futuras para mostrar.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Professor</th>
                        <th>Estúdio</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.slice(0, 5).map((row) => (
                        <tr key={`${row.sessionId}-${row.date}-${row.time}`}>
                          <td>{formatDateLabel(row.date)}</td>
                          <td>{row.time || '—'}</td>
                          <td>{row.teacher || 'Por atribuir'}</td>
                          <td>{row.studio || '—'}</td>
                          <td>
                            <span className={resolveBadgeClass(row.status)}>{resolveBadgeLabel(row.status)}</span>
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

                <h3>Comunicações recentes</h3>
                {communicationRows.length === 0 ? (
                  <p className="empty">Sem comunicações recentes.</p>
                ) : (
                  <ul className="list">
                    {communicationRows.map((notification) => (
                      <li key={notification.id}>
                        {notification.title || 'Notificação'}: {notification.message || 'Sem detalhe adicional.'}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
