/**
 * @file src/pages/student/MyHistoryPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ConfirmExecutionModal from '../../components/ConfirmExecutionModal'
import { getSessionHistory } from '../../services/coaching'
import './coaching.css'
import './history.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/student/dashboard' },
  { label: 'Coaching', href: '/student/coaching' },
  { label: 'Mapa de Coaching', href: '/student/coaching/map' },
  { label: 'Histórico', href: '/student/history' },
  { label: 'Inventário da Escola', href: '/student/inventory' },
  { label: 'As Minhas Rendas', href: '/student/inventory/rentals' },
  { label: 'Marketplace', href: '/student/marketplace' },
  { label: 'Os Meus Anúncios', href: '/student/marketplace/my-listings' },
  { label: 'Perdidos e Achados', href: '/student/lostfound' },
  { label: 'Notificações', href: '/student/notifications' },
  { label: 'Minha Conta', href: '/student/account' },
]

const PAGE_SIZE = 10

const STATUS_FILTERS = [
  { value: '', label: 'Todos os estados' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'awaiting', label: 'Aguarda validação' },
]

function formatDateTimePT(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function formatMoney(value) {
  const num = Number(value)
  if (value === null || value === undefined || Number.isNaN(num)) return '—'
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num)
}

function resolveStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('cancel')) return { label: 'Cancelada', variant: 'danger' }
  if (s.includes('complet') || s.includes('final')) return { label: 'Finalizada', variant: 'success' }
  if (s.includes('approv') || s.includes('schedul') || s.includes('active') || s.includes('ativa')) {
    return { label: 'Ativa', variant: 'success' }
  }
  if (s.includes('awaitingcompletion') || s.includes('awaiting_completion')) {
    return { label: 'Aguarda confirmação', variant: 'warning' }
  }
  if (s.includes('await') || s.includes('aguarda')) {
    return { label: 'Aguarda validação', variant: 'info' }
  }
  if (s.includes('teacher') || s.includes('professor')) return { label: 'Aguarda professor', variant: 'warning' }
  if (s.includes('admin') || s.includes('direct') || s.includes('manag')) {
    return { label: 'Aguarda direção', variant: 'info' }
  }
  if (s.includes('pend')) return { label: 'Pendente', variant: 'warning' }
  return { label: status || '—', variant: 'neutral' }
}

function matchesStatusFilter(session, filterValue) {
  if (!filterValue) return true
  const s = String(session.status || '').toLowerCase()
  switch (filterValue) {
    case 'pending': return s.includes('pend') && !s.includes('cancel')
    case 'confirmed': return s.includes('approv') || s.includes('schedul') || s.includes('confirm')
    case 'completed': return s.includes('complet') || s.includes('final')
    case 'cancelled': return s.includes('cancel')
    case 'awaiting': return s.includes('await') || s.includes('aguarda')
    default: return true
  }
}

function SessionDetailModal({ session, open, onClose, onConfirmExecution }) {
  if (!session) return null

  const badge = resolveStatusBadge(session.status)
  const canConfirmExecution =
    session.canConfirm ||
    String(session.status || '').toLowerCase().includes('awaitingcompletion') ||
    String(session.status || '').toLowerCase().includes('awaiting_completion')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sessão #${session.sessionId}`}
      size="md"
      className="coaching-modal"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          {canConfirmExecution ? (
            <Button
              variant="cta"
              onClick={() => onConfirmExecution(session)}
              data-testid="detail-confirm-exec"
            >
              Confirmar execução
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      }
    >
      <div className="bk-form" style={{ gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {canConfirmExecution && (
            <Badge variant="warning" size="sm">⏳ Aguarda a sua confirmação</Badge>
          )}
        </div>

        <div className="hist-detail-grid">
          <div className="hist-detail-item">
            <span className="hist-detail-label">Data e hora</span>
            <span>{formatDateTimePT(session.startTime)}</span>
          </div>
          {session.endTime ? (
            <div className="hist-detail-item">
              <span className="hist-detail-label">Fim</span>
              <span>{formatDateTimePT(session.endTime)}</span>
            </div>
          ) : null}
          <div className="hist-detail-item">
            <span className="hist-detail-label">Professor(es)</span>
            <span>{session.teachers?.map((t) => t.name).join(', ') || '—'}</span>
          </div>
          <div className="hist-detail-item">
            <span className="hist-detail-label">Modalidade</span>
            <span>{session.modalityName || '—'}</span>
          </div>
          <div className="hist-detail-item">
            <span className="hist-detail-label">Estúdio</span>
            <span>{session.studioName || '—'}</span>
          </div>
          <div className="hist-detail-item">
            <span className="hist-detail-label">Valor final</span>
            <span>{formatMoney(session.finalPrice)}</span>
          </div>
          {session.notes ? (
            <div className="hist-detail-item hist-detail-full">
              <span className="hist-detail-label">Notas</span>
              <span>{session.notes}</span>
            </div>
          ) : null}
          {session.cancellationJustification ? (
            <div className="hist-detail-item hist-detail-full">
              <span className="hist-detail-label">Justificação de cancelamento</span>
              <span style={{ color: '#991b1b' }}>{session.cancellationJustification}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

export default function MyHistoryPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : sidebarCollapsed ? '▶' : '◀'

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

  // Data state
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  // Detail modal
  const [detailSession, setDetailSession] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Confirm execution modal
  const [confirmSession, setConfirmSession] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSessionHistory()
      setSessions(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadHistory() }, [loadHistory])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [statusFilter, search])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sessions.filter((s) => {
      if (!matchesStatusFilter(s, statusFilter)) return false
      if (term) {
        const text = [
          `#${s.sessionId}`,
          s.studioName,
          s.modalityName,
          ...(s.teachers || []).map((t) => t.name),
          formatDateTimePT(s.startTime),
        ].join(' ').toLowerCase()
        if (!text.includes(term)) return false
      }
      return true
    })
  }, [sessions, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  function handleRowClick(session) {
    setDetailSession(session)
    setDetailOpen(true)
  }

  function handleOpenConfirmExecution(session) {
    setDetailOpen(false)
    setConfirmSession(session)
    setConfirmOpen(true)
  }

  function handleConfirmed(sessionId) {
    // Optimistic update: mark the session status
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId
          ? { ...s, status: 'AwaitingFinalValidation', canConfirm: false }
          : s
      )
    )
  }

  return (
    <div className="coaching-page">
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
                  onClick={() => { if (isMobile) setMobileOpen(false) }}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              className="nav-link"
              type="button"
              onClick={async () => { await logout(); navigate('/login?reason=logged-out', { replace: true }) }}
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
                aria-label="Toggle sidebar"
                onClick={() => {
                  if (isMobile) { setMobileOpen((v) => !v); return }
                  setSidebarCollapsed((v) => !v)
                }}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Histórico</h2>
                <p>Todas as sessões de coaching passadas e futuras</p>
              </div>
            </div>
            <div className="topbar-right">
              <Link
                to="/student/coaching"
                className="pill"
                style={{ textDecoration: 'none' }}
              >
                ← Coaching
              </Link>
            </div>
          </header>

          <div className="content-grid">
            <article className="panel">
              {/* Filters */}
              <div className="filters-bar" style={{ marginBottom: '16px' }}>
                <input
                  className="filter-input"
                  type="search"
                  placeholder="Pesquisar sessão, professor, estúdio…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Pesquisar histórico"
                  data-testid="history-search"
                  style={{ minWidth: '220px', flex: 1 }}
                />
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filtrar por estado"
                  data-testid="history-status-filter"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => { setSearch(''); setStatusFilter('') }}
                  aria-label="Limpar filtros"
                >
                  Limpar
                </button>
              </div>

              {/* Summary chip */}
              {!loading && !error ? (
                <p style={{ margin: '0 0 12px', fontSize: '0.83rem', color: '#6d6480' }}>
                  {filtered.length === sessions.length
                    ? `${sessions.length} sessão(ões) no total`
                    : `${filtered.length} de ${sessions.length} sessões`}
                </p>
              ) : null}

              {/* Error */}
              {error ? (
                <div className="error-banner">
                  {error}
                  <button type="button" className="ghost-btn" onClick={loadHistory}>Tentar novamente</button>
                </div>
              ) : null}

              {/* Loading */}
              {loading ? (
                <div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton-row" style={{ marginBottom: 8, height: 20 }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="empty-state">
                  {sessions.length === 0
                    ? 'Sem histórico de sessões para mostrar.'
                    : 'Nenhuma sessão corresponde aos filtros selecionados.'}
                </p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table data-testid="history-table">
                      <thead>
                        <tr>
                          <th>Sessão</th>
                          <th>Data e hora</th>
                          <th>Professor(es)</th>
                          <th>Modalidade</th>
                          <th>Estúdio</th>
                          <th>Estado</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((s) => {
                          const badge = resolveStatusBadge(s.status)
                          const canConfirm =
                            s.canConfirm ||
                            String(s.status || '').toLowerCase().includes('awaitingcompletion') ||
                            String(s.status || '').toLowerCase().includes('awaiting_completion')

                          return (
                            <tr
                              key={s.sessionId}
                              className={`hist-row${canConfirm ? ' hist-row--highlight' : ''}`}
                              onClick={() => handleRowClick(s)}
                              style={{ cursor: 'pointer' }}
                              data-testid={`history-row-${s.sessionId}`}
                            >
                              <td>
                                <span style={{ fontWeight: 600 }}>#{s.sessionId}</span>
                              </td>
                              <td>{formatDateTimePT(s.startTime)}</td>
                              <td>{s.teachers?.map((t) => t.name).join(', ') || '—'}</td>
                              <td>{s.modalityName || '—'}</td>
                              <td>{s.studioName || '—'}</td>
                              <td>
                                <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                                {canConfirm ? (
                                  <button
                                    type="button"
                                    className="confirm-btn"
                                    style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '3px 10px' }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenConfirmExecution(s)
                                    }}
                                    data-testid={`confirm-btn-${s.sessionId}`}
                                  >
                                    Confirmar execução
                                  </button>
                                ) : null}
                              </td>
                              <td>{formatMoney(s.finalPrice)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 ? (
                    <div className="hist-pagination" data-testid="pagination">
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="Página anterior"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`hist-page-btn${p === page ? ' active' : ''}`}
                          onClick={() => setPage(p)}
                          aria-current={p === page ? 'page' : undefined}
                          aria-label={`Página ${p}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Próxima página"
                      >
                        ›
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          </div>
        </main>
      </div>

      {/* Session detail modal */}
      <SessionDetailModal
        open={detailOpen}
        session={detailSession}
        onClose={() => setDetailOpen(false)}
        onConfirmExecution={handleOpenConfirmExecution}
      />

      {/* Confirm execution modal */}
      <ConfirmExecutionModal
        open={confirmOpen}
        session={confirmSession}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={handleConfirmed}
      />
    </div>
  )
}
