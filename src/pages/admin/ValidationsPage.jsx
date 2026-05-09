/**
 * @file src/pages/admin/ValidationsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import api from '../../services/api'
import '../admin-studios.css'

const navigationItems = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/validations', label: 'Validações' },
  { href: '/admin/studios', label: 'Estúdios' },
  { href: '/admin/users', label: 'Utilizadores' },
  { href: '/admin/inventory', label: 'Inventário da Escola' },
  { href: '/admin/marketplace', label: 'Marketplace' },
  { href: '/admin/finance', label: 'Finanças' },
  { href: '/admin/audit', label: 'Auditoria' },
]

function formatNotificationDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function CountdownBadge({ submittedAt, maxHours = 48 }) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const compute = () => {
      const start = new Date(submittedAt).getTime()
      const limit = start + maxHours * 3600 * 1000
      const diff = limit - Date.now()
      if (diff <= 0) { setLabel('Expirado'); setUrgent(true); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setLabel(`${h}h ${m}m restantes`)
      setUrgent(h < 12)
    }
    compute()
    const t = setInterval(compute, 60000)
    return () => clearInterval(t)
  }, [submittedAt, maxHours])

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
      background: urgent ? 'var(--studio-error-bg)' : 'var(--studio-soft-bg)',
      color: urgent ? 'var(--studio-error-ink)' : 'var(--studio-muted)',
      border: `1px solid ${urgent ? 'var(--studio-error-line)' : 'var(--studio-soft-line)'}`,
      whiteSpace: 'nowrap',
    }}>
      {urgent && '⚠ '}{label}
    </span>
  )
}

const selectStyle = {
  border: '1px solid var(--studio-field-line)',
  borderRadius: '10px',
  padding: '8px 10px',
  background: 'var(--studio-field-bg)',
  color: 'var(--studio-ink)',
  font: 'inherit',
}

function ValidationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('bookings')

  const [bookings, setBookings] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [sortBookings, setSortBookings] = useState('urgent')
  const [filterModality, setFilterModality] = useState('')

  const [finalizations, setFinalizations] = useState([])
  const [loadingFinals, setLoadingFinals] = useState(true)
  const [sortFinals, setSortFinals] = useState('recent')
  const [filterTeacher, setFilterTeacher] = useState('')

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const notificationBoxRef = useRef(null)
  const displayName = user?.fullName || user?.name || user?.email || 'Utilizador'

  const sidebarActivePath = location.pathname
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const [bookingsResult, joinResult] = await Promise.allSettled([
        api.get('/admin/validations/pending-approval'),
        api.get('/admin/coachingjoin-requests/pending'),
      ])

      if (bookingsResult.status === 'fulfilled') {
        const sessions = bookingsResult.value.data?.sessions
        setBookings(Array.isArray(sessions) ? sessions : [])
      } else {
        setBookings([
          { sessionId: 1, teacherName: 'João Silva', requesterName: 'Ana Clara', date: '2026-05-15', startTime: '18:00', endTime: '19:00', studioName: 'Estúdio A', modalityName: 'Piano', createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
          { sessionId: 2, teacherName: 'Maria Santos', requesterName: 'Carlos Gomes', date: '2026-05-16', startTime: '19:30', endTime: '21:00', studioName: 'Estúdio B', modalityName: 'Canto', createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
        ])
      }

      if (joinResult.status === 'fulfilled') {
        const requests = joinResult.value.data
        setJoinRequests(Array.isArray(requests) ? requests : [])
      } else {
        setJoinRequests([])
      }
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  const loadFinalizations = useCallback(async () => {
    setLoadingFinals(true)
    try {
      const { data } = await api.get('/admin/validations/post-session')
      const sessions = data?.sessions
      setFinalizations(Array.isArray(sessions) ? sessions : [])
    } catch {
      setFinalizations([])
    } finally {
      setLoadingFinals(false)
    }
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

  const refreshNotificationCount = useCallback(async () => {
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
      setNotificationUnreadCount(preview.unreadCount)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    void Promise.all([loadBookings(), loadFinalizations(), refreshNotificationCount()])
  }, [loadBookings, loadFinalizations, refreshNotificationCount])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const update = () => { setIsMobile(mq.matches); if (!mq.matches) setMobileOpen(false) }
    update()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const handleClick = (e) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notificationsOpen])

  const handleSidebarToggle = () => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
  }

  const handleNotificationsClick = () => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && !notificationsLoaded) void loadNotificationPreview()
  }

  const handleLogout = async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  const handleApprove = async (id) => {
    setNotice('')
    setError('')
    try {
      await api.patch(`/admin/validations/${id}/approve`)
      setNotice('Marcação aprovada com sucesso.')
      await loadBookings()
    } catch { setError('Não foi possível aprovar a marcação.') }
  }

  const handleRejectConfirm = async (id) => {
    if (!rejectReason.trim()) return
    setNotice('')
    setError('')
    try {
      await api.patch(`/admin/validations/${id}/reject`, { reason: rejectReason })
      setNotice('Marcação rejeitada.')
      setRejectingId(null)
      setRejectReason('')
      await loadBookings()
    } catch { setError('Não foi possível rejeitar a marcação.') }
  }

  const handleApproveJoin = async (id) => {
    setNotice('')
    setError('')
    try {
      await api.patch(`/admin/coachingjoin-requests/${id}/approve`)
      setNotice('Pedido de adesão aprovado.')
      await loadBookings()
    } catch { setError('Não foi possível aprovar o pedido de adesão.') }
  }

  const handleFinalize = async (id) => {
    setNotice('')
    setError('')
    try {
      await api.patch(`/admin/sessions/${id}/finalize-validation`)
      setNotice('Sessão finalizada. Entradas financeiras criadas.')
      await loadFinalizations()
    } catch { setError('Não foi possível finalizar a sessão.') }
  }

  const modalities = [...new Set(bookings.map((b) => b.modalityName).filter(Boolean))]
  const teachers = [...new Set(finalizations.map((s) => s.teacherName).filter(Boolean))]

  const sortedBookings = [...bookings]
    .filter((b) => !filterModality || b.modalityName === filterModality)
    .sort((a, b) => sortBookings === 'urgent'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt)
    )

  const sortedFinals = [...finalizations]
    .filter((s) => !filterTeacher || s.teacherName === filterTeacher)
    .sort((a, b) => sortFinals === 'oldest'
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date)
    )

  return (
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
          <h2>Gestão</h2>
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${sidebarActivePath === item.href ? ' active' : ''}`}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
          <a className="nav-link" href="/login" title={`Terminar sessão de ${displayName}`} onClick={handleLogout}>
            Terminar Sessão
          </a>
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
              <h2>Fila de Validação</h2>
            </div>
            <p>Aprovação de marcações e fecho financeiro de sessões</p>
          </div>

          <div className="topbar-right" ref={notificationBoxRef}>
            <button type="button" className="pill notifications-pill" onClick={handleNotificationsClick}>
              Notificações{notificationUnreadCount > 0 ? ` (${notificationUnreadCount})` : ''}
            </button>

            {notificationsOpen ? (
              <div className="notifications-popover">
                <div className="notifications-popover-header">
                  <strong>Notificações</strong>
                </div>
                {notificationsLoading ? <p className="notifications-state">A carregar...</p> : null}
                {!notificationsLoading && notificationsError ? <p className="notifications-state error">{notificationsError}</p> : null}
                {!notificationsLoading && !notificationsError && notifications.length === 0 ? <p className="notifications-state">Sem notificações.</p> : null}
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
                <Link to="/admin/notifications" className="notifications-more-link" onClick={() => setNotificationsOpen(false)}>
                  Ver Mais
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <section className="content-grid">
          {notice ? <div className="soft-box" role="status" aria-live="polite">{notice}</div> : null}
          {error ? <div className="soft-box error" role="alert">{error}</div> : null}

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={activeTab === 'bookings' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('bookings')}
            >
              Aprovação de Marcações{bookings.length > 0 ? ` · ${bookings.length}` : ''}
            </button>
            <button
              type="button"
              className={activeTab === 'finals' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('finals')}
            >
              Validações Finais{finalizations.length > 0 ? ` · ${finalizations.length}` : ''}
            </button>
          </div>

          {/* Tab 1 — Aprovação de Marcações */}
          {activeTab === 'bookings' ? (
            <>
              <article className="panel">
                <div className="panel-header">
                  <h3>Sessões pendentes de aprovação</h3>
                  <div className="card-actions">
                    <select value={sortBookings} onChange={(e) => setSortBookings(e.target.value)} style={selectStyle}>
                      <option value="urgent">Mais urgentes primeiro</option>
                      <option value="recent">Mais recentes primeiro</option>
                    </select>
                    {modalities.length > 0 ? (
                      <select value={filterModality} onChange={(e) => setFilterModality(e.target.value)} style={selectStyle}>
                        <option value="">Todas as modalidades</option>
                        {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : null}
                  </div>
                </div>

                {loadingBookings ? (
                  <div className="soft-box">A carregar marcações pendentes...</div>
                ) : sortedBookings.length === 0 ? (
                  <div className="soft-box">Não há sessões pendentes de aprovação.</div>
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Professor</th>
                            <th>Solicitado por</th>
                            <th>Data</th>
                            <th>Horário</th>
                            <th>Estúdio</th>
                            <th>Modalidade</th>
                            <th>Prazo (48h)</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedBookings.map((b) => (
                            <tr key={b.sessionId}>
                              <td>{b.teacherName}</td>
                              <td>{b.requesterName || '—'}</td>
                              <td>{b.date || '—'}</td>
                              <td>{b.startTime ? `${b.startTime}–${b.endTime}` : '—'}</td>
                              <td>{b.studioName || '—'}</td>
                              <td>{b.modalityName || '—'}</td>
                              <td><CountdownBadge submittedAt={b.createdAt} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button type="button" className="moderation-action-btn approve" onClick={() => handleApprove(b.sessionId)}>
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    className={`moderation-action-btn ${rejectingId === b.sessionId ? 'delete' : 'reject'}`}
                                    onClick={() => setRejectingId(rejectingId === b.sessionId ? null : b.sessionId)}
                                  >
                                    {rejectingId === b.sessionId ? 'Cancelar' : 'Rejeitar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {rejectingId !== null ? (
                      <div style={{ marginTop: '12px', padding: '14px 16px', border: '1px solid var(--studio-error-line)', borderRadius: '12px', background: 'var(--studio-error-bg)', display: 'grid', gap: '10px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--studio-error-ink)' }}>
                          Motivo da rejeição da sessão #{rejectingId}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Descreva o motivo..."
                            style={{ flex: '1 1 240px', border: '1px solid var(--studio-error-line)', borderRadius: '10px', padding: '8px 10px', background: '#fff', color: 'var(--studio-ink)', font: 'inherit' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="danger-btn"
                            disabled={!rejectReason.trim()}
                            onClick={() => handleRejectConfirm(rejectingId)}
                          >
                            Confirmar rejeição
                          </button>
                          <button type="button" className="ghost-btn" onClick={() => { setRejectingId(null); setRejectReason('') }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </article>

              {joinRequests.length > 0 ? (
                <article className="panel">
                  <div className="panel-header">
                    <h3>Pedidos de adesão a coaching</h3>
                  </div>
                  <p>Pedidos de estudantes a aguardar aprovação da direção (2.ª etapa).</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Professor</th>
                          <th>Estudante</th>
                          <th>Modalidade</th>
                          <th>Submetido em</th>
                          <th>Prazo</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {joinRequests.map((j) => (
                          <tr key={j.id}>
                            <td>{j.teacherName}</td>
                            <td>{j.studentName}</td>
                            <td>{j.modality || '—'}</td>
                            <td>{formatDate(j.submittedAt)}</td>
                            <td><CountdownBadge submittedAt={j.submittedAt} /></td>
                            <td>
                              <button type="button" className="moderation-action-btn approve" onClick={() => handleApproveJoin(j.id)}>
                                Aprovar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : null}
            </>
          ) : null}

          {/* Tab 2 — Validações Finais */}
          {activeTab === 'finals' ? (
            <article className="panel">
              <div className="panel-header">
                <h3>Sessões para validação final</h3>
                <div className="card-actions">
                  <select value={sortFinals} onChange={(e) => setSortFinals(e.target.value)} style={selectStyle}>
                    <option value="recent">Mais recentes primeiro</option>
                    <option value="oldest">Mais antigos primeiro</option>
                  </select>
                  {teachers.length > 0 ? (
                    <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} style={selectStyle}>
                      <option value="">Todos os professores</option>
                      {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : null}
                </div>
              </div>
              <p>Sessões confirmadas por professor e estudante. A validação final desencadeia o serviço de pricing e cria as entradas financeiras.</p>

              {loadingFinals ? (
                <div className="soft-box">A carregar sessões...</div>
              ) : sortedFinals.length === 0 ? (
                <div className="soft-box">Não há sessões prontas para validação final.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Professor</th>
                        <th>Estudante</th>
                        <th>Data da Sessão</th>
                        <th>Modalidade</th>
                        <th>Confirmações</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFinals.map((s) => (
                        <tr key={s.id}>
                          <td>{s.teacherName}</td>
                          <td>{s.studentName}</td>
                          <td>{formatDate(s.date)}</td>
                          <td>{s.modality || '—'}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 9px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                              background: 'color-mix(in srgb, var(--studio-cta-start) 15%, #ffffff 85%)',
                              color: '#0d6b63',
                              border: '1px solid color-mix(in srgb, var(--studio-cta-start) 48%, #ffffff 52%)',
                            }}>
                              ✓ Ambos confirmaram
                            </span>
                          </td>
                          <td>
                            <button type="button" className="cta" onClick={() => handleFinalize(s.id)}>
                              Finalizar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default ValidationsPage
