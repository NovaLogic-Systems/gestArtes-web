import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import NotificationsBell from '../../components/NotificationsBell'
import Badge from '../../components/ui/Badge'
import KPICard from '../../components/ui/KPICard'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Table from '../../components/ui/Table'
import Toast from '../../components/ui/Toast'
import '../admin-studios.css'
import './DashboardPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

function toInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatTime(value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

const SESSION_STATUS_META = {
  pending_approval:                { label: 'Aguarda aprovação',       variant: 'warning' },
  approved:                        { label: 'Agendada',                variant: 'info'    },
  rejected:                        { label: 'Rejeitada',               variant: 'danger'  },
  scheduled:                       { label: 'Agendada',                variant: 'info'    },
  completion_confirmation_pending: { label: 'A confirmar',             variant: 'warning' },
  finalization_validation_pending: { label: 'A validar',               variant: 'warning' },
  finalized:                       { label: 'Finalizada',              variant: 'success' },
  accounting_table_updated:        { label: 'Contabilizada',           variant: 'success' },
  no_show:                         { label: 'Falta s/ aviso',          variant: 'danger'  },
  cancelled:                       { label: 'Cancelada',               variant: 'neutral' },
  cancelled_justified:             { label: 'Cancelada (justificada)', variant: 'neutral' },
  cancelled_timeout:               { label: 'Cancelada (timeout)',     variant: 'danger'  },
  cancelled_rejected:              { label: 'Cancelada (rejeitada)',   variant: 'danger'  },
}

function normalizeStatusKey(statusName) {
  return String(statusName ?? '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function resolveSessionStatusMeta(statusName) {
  const key = normalizeStatusKey(statusName)
  if (SESSION_STATUS_META[key]) return SESSION_STATUS_META[key]
  if (key.includes('finali') || key.includes('conclu')) return { label: 'Finalizada',          variant: 'success' }
  if (key.includes('no_show') || key.includes('falta')) return { label: 'Falta s/ aviso',      variant: 'danger'  }
  if (key.includes('cancel'))                            return { label: 'Cancelada',          variant: 'neutral' }
  if (key.includes('reject'))                            return { label: 'Rejeitada',          variant: 'danger'  }
  if (key.includes('approv') || key.includes('aprov'))   return { label: 'Agendada',           variant: 'info'    }
  if (key.includes('pend'))                              return { label: 'Aguarda aprovação',  variant: 'warning' }
  if (key.includes('valid'))                             return { label: 'A validar',          variant: 'warning' }
  if (key.includes('schedul') || key.includes('agend'))  return { label: 'Agendada',           variant: 'info'    }
  return { label: 'Estado desconhecido', variant: 'neutral' }
}

function normalizeSummary(data) {
  return {
    classesToday: toInteger(data?.classesToday),
    pendingConfirmations: toInteger(data?.pendingConfirmations),
    pendingRequests: toInteger(data?.pendingRequests ?? data?.admissionRequests),
    admissionRequests: toInteger(data?.admissionRequests),
    noShows: toInteger(data?.noShows),
  }
}

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function normalizeSchedule(data) {
  const rows = Array.isArray(data?.schedule) ? data.schedule : []
  return rows.map((row) => ({
    sessionId: toInteger(row?.sessionId),
    time: row?.time ?? '—',
    studio: String(row?.studio ?? '—').trim() || '—',
    status: String(row?.status ?? '').trim(),
    modalityName: String(row?.modalityName ?? '—').trim() || '—',
    format: row?.format ? String(row.format).trim() : '—',
    maxParticipants: toInteger(row?.maxParticipants),
  }))
}


const scheduleColumns = [
  {
    key: 'time',
    header: 'Hora',
    render: (row) => <strong>{formatTime(row.time)}</strong>,
  },
  {
    key: 'format',
    header: 'Formato',
    render: (row) => <span>{row.format}</span>,
  },
  {
    key: 'modalityName',
    header: 'Modalidade',
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
    render: (row) => {
      const meta = resolveSessionStatusMeta(row.status)
      return (
        <Badge variant={meta.variant} size="sm" aria-label={`Estado da sessão: ${meta.label}`}>
          {meta.label}
        </Badge>
      )
    },
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
  const searchTerm = ''

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

  const appShellClassName = ['app-shell', !isMobile && sidebarCollapsed ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
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
      if (!mobile) {
        setMobileOpen(false)
      } else {
        setSidebarCollapsed(false)
      }
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadData = useCallback(async () => {
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

  const handleReload = useCallback(() => {
    setLoading(true)
    setError('')
    void loadData()
  }, [loadData])

  const filteredSchedule = useMemo(() => {
    const term = normalizeText(searchTerm)
    if (!term) return schedule
    return schedule.filter((row) =>
      normalizeText([row.modalityName, row.studio, row.status, String(row.sessionId)].join(' ')).includes(term)
    )
  }, [schedule, searchTerm])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      api.get('/teacher/dashboard'),
      api.get('/teacher/schedule/today'),
    ])
      .then(([summaryResult, scheduleResult]) => {
        if (cancelled) {
          return
        }

        setSummary(summaryResult.status === 'fulfilled' ? normalizeSummary(summaryResult.value.data) : null)
        setSchedule(scheduleResult.status === 'fulfilled' ? normalizeSchedule(scheduleResult.value.data) : [])

        if (summaryResult.status === 'rejected' && scheduleResult.status === 'rejected') {
          setError('Não foi possível carregar os dados do painel. Verifica a ligação ao servidor.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

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
            </div>

            <div className="topbar-right">
              <Link className="pill" to="/teacher/account">
                Minha Conta
              </Link>
              <NotificationsBell pageLink="/teacher/notifications" />
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
                  onClick={handleReload}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className="kpi-grid">
              <KPICard
                title="Aulas hoje"
                value={summary ? summary.classesToday : '—'}
                accent="#0b9d8f"
              />
              <KPICard
                title="Pedidos pendentes"
                value={summary ? summary.pendingRequests : '—'}
                accent="#c2410c"
              />
              <KPICard
                title="Sessões a confirmar"
                value={summary ? summary.pendingConfirmations : '—'}
                accent="#6f5ca5"
              />
              <KPICard
                title="Faltas sem aviso"
                value={summary ? summary.noShows : '—'}
                accent="#b91c1c"
              />
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
                    rows={filteredSchedule}
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
                <p className="panel-subtle">Operações do dia a dia.</p>
                <div className="quick-actions">
                  <Link className="cta" to="/teacher/schedule">Submeter disponibilidade</Link>
                  <Link className="cta" to="/teacher/sessions/confirmation">Confirmar conclusão</Link>
                  <Link className="cta secondary" to="/teacher/sessions/confirmation">Registar falta sem aviso</Link>
                </div>

                <h3 className="panel-subheading">Atalhos</h3>
                <p className="panel-subtle">Acesso rápido aos módulos do professor.</p>
                <div className="quick-actions">
                  <Link className="cta secondary" to="/teacher/schedule">Horário</Link>
                  <Link className="cta secondary" to="/teacher/coaching">Coaching</Link>
                  <Link className="cta secondary" to="/teacher/inventory">Inventário da Escola</Link>
                  <Link className="cta secondary" to="/teacher/marketplace">Marketplace</Link>
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
