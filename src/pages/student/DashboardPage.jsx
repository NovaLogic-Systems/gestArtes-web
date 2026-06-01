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
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import { localizeApiError } from '../../utils/apiErrors'

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

  if (normalized.includes('reject') || normalized.includes('rejeit')) {
    return 'Rejeitada'
  }

  if (normalized.includes('final') || normalized.includes('complet')) {
    return 'Finalizada'
  }

  return 'Estado desconhecido'
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

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}


export default function DashboardPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const searchTerm = ''
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
      setError(localizeApiError(requestError, 'Não foi possível carregar o painel do aluno.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const scheduleRows = useMemo(() => {
    const rows = dashboard?.schedule ?? []
    const term = normalizeText(searchTerm.trim())

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const text = normalizeText([row.teacher, row.studio, row.status, row.date, row.time].join(' '))
      return text.includes(term)
    })
  }, [dashboard?.schedule, searchTerm])

  const quickActions = [
    { label: 'Nova marcação', to: '/student/coaching' },
    { label: 'Histórico', to: '/student/history' },
    { label: 'Confirmar execução', to: '/student/coaching#confirmacao', secondary: true },
    { label: 'Gerir cancelamentos', to: '/student/coaching', secondary: true },
  ]

  return (
    <div className="student-dashboard">
      <a href="#main-content" className="skip-to-content">Ir para o conteúdo principal</a>
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
          </nav>
        </aside>

        <main className="main page-transition">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarToggleLabel}
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2 id="main-content">Painel Aluno</h2>
              </div>
            </div>
            <div className="topbar-right">
              <label htmlFor="dashboard-search" className="sr-only">Pesquisar sessões</label>
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
              <button className="kpi" type="button" style={{textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', border: '1px solid var(--border)'}}>

                <h3>Sessões agendadas</h3>
                <strong>{dashboard?.upcomingSessions ?? 0}</strong>
              
</button>
              <button className="kpi" type="button" style={{textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', border: '1px solid var(--border)'}}>

                <h3>Validações pendentes</h3>
                <strong>{dashboard?.pendingValidations ?? 0}</strong>
              
</button>
              <button className="kpi" type="button" style={{textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', border: '1px solid var(--border)'}}>

                <h3>Pedidos em análise</h3>
                <strong>{dashboard?.reviewRequests ?? 0}</strong>
              
</button>
              <button className="kpi" type="button" style={{textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', border: '1px solid var(--border)'}}>

                <h3>Anúncios no marketplace</h3>
                <strong>{dashboard?.activeMarketplaceListings ?? 0}</strong>

</button>
            </div>

            <div className="split">
              <article className="panel">
                <h3>Próximas aulas</h3>

                {loading ? (
                  <p className="panel-subtle">A carregar sessões...</p>
                ) : scheduleRows.length === 0 ? (
                  <p className="empty">Sem sessões futuras para mostrar.</p>
                ) : (
                  <div className="table-scroll" role="region" aria-label="Próximas aulas">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Data</th>
                          <th scope="col">Hora</th>
                          <th scope="col">Professor</th>
                          <th scope="col">Estúdio</th>
                          <th scope="col">Estado</th>
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
                  </div>
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
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
