/**
 * @file src/pages/student/DashboardPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './NotificationsPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/student/dashboard' },
  { label: 'Coaching', href: '/student/coaching' },
  { label: 'Mapa de Coaching', href: '/student/coaching/map' },
  { label: 'Inventário da Escola', href: '/student/inventory' },
  { label: 'As Minhas Rendas', href: '/student/inventory/rentals' },
  { label: 'Marketplace', href: '/student/marketplace' },
  { label: 'Os Meus Anúncios', href: '/student/marketplace/my-listings' },
  { label: 'Perdidos e Achados', href: '/student/lostfound' },
  { label: 'Notificações', href: '/student/notifications' },
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarHidden = isMobile || sidebarCollapsed

  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : '']
    .filter(Boolean)
    .join(' ')

  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : '']
    .filter(Boolean)
    .join(' ')

  const sidebarToggleSymbol = isMobile
    ? (mobileOpen ? '✕' : '☰')
    : (sidebarCollapsed ? '▶' : '◀')

  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
      return
    }
    setSidebarCollapsed((value) => !value)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [isMobile])

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
      const response = await api.get('/student/dashboard')
      setDashboard(response.data ?? null)
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
    const rows = dashboard?.schedule ?? []
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const text = [row.teacher, row.studio, row.status, row.date, row.time].join(' ').toLowerCase()
      return text.includes(term)
    })
  }, [dashboard?.schedule, searchTerm])

  const communicationRows = useMemo(() => {
    return (dashboard?.notifications ?? []).slice(0, 3)
  }, [dashboard?.notifications])

  const quickActions = [
    { label: 'Nova marcação', to: '/student/coaching' },
    { label: 'Confirmar execução', to: '/student/coaching#confirmacao' },
    { label: 'Gerir cancelamentos', to: '/student/coaching', secondary: true },
  ]

  return (
    <div className="student-dashboard">
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

          <div className="nav-group">
            <h2>Aluno</h2>
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
              <button className="menu-toggle" id="menuToggle" type="button" aria-controls="sidebar" aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'} onClick={() => setMobileOpen((current) => !current)}>
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
              <article className="kpi">
                <h3>Sessões agendadas</h3>
                <strong>{dashboard?.upcomingSessions ?? 0}</strong>
              </article>
              <article className="kpi">
                <h3>Validações pendentes</h3>
                <strong>{dashboard?.pendingValidations ?? 0}</strong>
              </article>
              <article className="kpi">
                <h3>Pedidos em análise</h3>
                <strong>{dashboard?.reviewRequests ?? 0}</strong>
              </article>
              <article className="kpi">
                <h3>Pagamentos externos em curso</h3>
                <strong>{dashboard?.externalPaymentsInProgress ?? 0}</strong>
              </article>
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
                <div className="quick-actions">
                  {quickActions.map((action) => (
                    <Link key={action.label} className={`cta${action.secondary ? ' secondary' : ''}`} to={action.to}>
                      {action.label}
                    </Link>
                  ))}
                </div>

                <h3>Comunicações recentes</h3>
                {communicationRows.length === 0 ? (
                  <p className="empty">Sem comunicações recentes.</p>
                ) : (
                  <ul className="list">
                    {communicationRows.map((notification) => (
                      <li key={notification.id}>
                        {notification.title}: {notification.message || 'Sem detalhe adicional.'}
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
