/**
 * @file src/pages/admin/ValidationsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import NotificationsBell from '../../components/NotificationsBell'
import { ADMIN_NAV_ITEMS as navigationItems } from './adminNav'
import '../admin-studios.css'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'



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

  const daysPT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  const formatMode = (mode) => {
    if (mode === 'weekly') return 'Semanal (Recorrente)'
    if (mode === 'range' || mode === 'semester') return 'Pontual'
    return mode || '—'
  }

  const formatSlotSummary = (a) => {
    try {
      if (a.mode === 'weekly' && a.slot && Array.isArray(a.slot.days)) {
        return a.slot.days.map((d) => {
          const dayName = daysPT[d.dayOfWeek] || d.dayOfWeek
          const start = (d.startTime || '').substring(0, 5)
          const end = (d.endTime || '').substring(0, 5)
          return `${dayName} (${start}-${end})`
        }).join('; ')
      }

      if (a.mode === 'weekly' && a.slot && a.slot.dayOfWeek !== undefined) {
        const dayName = daysPT[a.slot.dayOfWeek] || a.slot.dayOfWeek
        const start = (a.slot.startTime || '').substring(0, 5)
        const end = (a.slot.endTime || '').substring(0, 5)
        return `${dayName}, ${start} - ${end}`
      }

      if (a.mode === 'range' && a.slot) {
        return `${formatDate(a.slot.startDateTime)} → ${formatDate(a.slot.endDateTime)}`
      }

      return '—'
    } catch {
      return '—'
    }
  }

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('bookings')

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [sortBookings, setSortBookings] = useState('urgent')
  const [filterModality, setFilterModality] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [finalizations, setFinalizations] = useState([])
  const [loadingFinals, setLoadingFinals] = useState(true)
  const [sortFinals, setSortFinals] = useState('recent')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterModalityFinals, setFilterModalityFinals] = useState('')

  const [joinRequests, setJoinRequests] = useState([])
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(true)

  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState(null)

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
    setError('')
    try {
      const { data } = await api.get('/admin/validations/pending-approval')
      const sessions = data?.sessions
      setBookings(Array.isArray(sessions) ? sessions : [])
    } catch {
      setBookings([])
      setError('Não foi possível carregar os pedidos de coaching pendentes.')
    }
    setLoadingBookings(false)
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

  const loadJoinRequests = useCallback(async () => {
    setLoadingJoinRequests(true)
    try {
      const { data } = await api.get('/admin/coaching/join-requests/pending')
      const items = data?.requests || data || []
      setJoinRequests(Array.isArray(items) ? items : [])
    } catch {
      setJoinRequests([])
    } finally {
      setLoadingJoinRequests(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadBookings(), loadFinalizations(), loadJoinRequests()])
    return undefined
  }, [loadBookings, loadFinalizations, loadJoinRequests])

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

  const handleSidebarToggle = () => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
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
      setNotice('Pedido de coaching rejeitado com sucesso.')
      setRejectingId(null)
      setRejectReason('')
      await loadBookings()
    } catch { setError('Não foi possível rejeitar o pedido de coaching.') }
  }

  const handleApproveAvailability = async (id) => {
    setNotice('')
    setError('')
    setLoadingId(id)
    try {
      await api.patch(`/admin/validations/availability/${id}/approve`)
      setNotice('Disponibilidade aprovada com sucesso.')
      await loadBookings()
    } catch {
      setError('Não foi possível aprovar a disponibilidade.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleRejectAvailability = async (id, notes = '') => {
    setNotice('')
    setError('')
    setLoadingId(id)
    try {
      await api.patch(`/admin/validations/availability/${id}/reject`, { reviewNotes: notes })
      setNotice('Disponibilidade rejeitada.')
      await loadBookings()
    } catch {
      setError('Não foi possível rejeitar a disponibilidade.')
    } finally {
      setLoadingId(null)
    }
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

  const handleApproveJoin = async (id) => {
    setNotice('')
    setError('')
    setLoadingId(id)
    try {
      await api.patch(`/admin/coaching/join-requests/${id}/approve`)
      setNotice('Pedido de adesão aprovado.')
      await loadJoinRequests()
    } catch {
      setError('Não foi possível aprovar a adesão.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleRejectJoin = async (id) => {
    setNotice('')
    setError('')
    setLoadingId(id)
    try {
      await api.patch(`/admin/coaching/join-requests/${id}/reject`)
      setNotice('Pedido de adesão rejeitado.')
      await loadJoinRequests()
    } catch {
      setError('Não foi possível rejeitar a adesão.')
    } finally {
      setLoadingId(null)
    }
  }

  const modalities = [...new Set(bookings.map((b) => b.modalityName).filter(Boolean))]
  const teachers = [...new Set(finalizations.map((s) => s.teacherName).filter(Boolean))]
  const modalitiesFinals = [...new Set(finalizations.map((s) => s.modalityName).filter(Boolean))]

  const searchFilter = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm])

  const sortedBookings = useMemo(() => [...bookings]
    .filter((b) => !filterModality || b.modalityName === filterModality)
    .filter((b) => !searchFilter || [b.teacherName, b.requesterName, b.studioName, b.modalityName, b.date].join(' ').toLowerCase().includes(searchFilter))
    .sort((a, b) => sortBookings === 'urgent'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt)
    ), [bookings, filterModality, searchFilter, sortBookings])

  const sortedFinals = useMemo(() => [...finalizations]
    .filter((s) => !filterTeacher || s.teacherName === filterTeacher)
    .filter((s) => !filterModalityFinals || s.modalityName === filterModalityFinals)
    .filter((s) => !searchFilter || [s.teacherName, s.studioName, s.modalityName].join(' ').toLowerCase().includes(searchFilter))
    .sort((a, b) => sortFinals === 'oldest'
      ? new Date(a.startTime) - new Date(b.startTime)
      : new Date(b.startTime) - new Date(a.startTime)
    ), [finalizations, filterTeacher, filterModalityFinals, searchFilter, sortFinals])

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
            <input
              type="search"
              className="topbar-search"
              placeholder="Pesquisar validações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="topbar-right">
            <NotificationsBell pageLink="/admin/notifications" />
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
              Pedidos de coaching{bookings.length > 0 ? ` · ${bookings.length}` : ''}
            </button>
            <button
              type="button"
              className={activeTab === 'finals' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('finals')}
            >
              Validações Finais{finalizations.length > 0 ? ` · ${finalizations.length}` : ''}
            </button>
            <button
              type="button"
              className={activeTab === 'joins' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('joins')}
            >
              Adesões{joinRequests.length > 0 ? ` · ${joinRequests.length}` : ''}
            </button>
          </div>

          {/* Tab 1 — Aprovação de Marcações */}
          {activeTab === 'bookings' ? (
            <>
              <article className="panel">
                <div className="panel-header">
                  <h3>Pedidos de coaching pendentes</h3>
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
                  <div className="soft-box">A carregar pedidos de coaching pendentes...</div>
                ) : sortedBookings.length === 0 ? (
                  <div className="soft-box">Não há pedidos de coaching pendentes.</div>
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
                          Motivo da rejeição do pedido de coaching #{rejectingId}
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
                  {modalitiesFinals.length > 0 ? (
                    <select value={filterModalityFinals} onChange={(e) => setFilterModalityFinals(e.target.value)} style={selectStyle}>
                      <option value="">Todas as modalidades</option>
                      {modalitiesFinals.map((m) => <option key={m} value={m}>{m}</option>)}
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
                        <tr key={s.sessionId}>
                          <td>{s.teacherName || '—'}</td>
                          <td>{s.studentName || '—'}</td>
                          <td>{formatDate(s.startTime)}</td>
                          <td>{s.modalityName || '—'}</td>
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
                            <button type="button" className="cta" onClick={() => handleFinalize(s.sessionId)}>
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

          {/* Tab 3 — Adesões (Join Requests) */}
          {activeTab === 'joins' ? (
            <article className="panel">
              <div className="panel-header">
                <h3>Pedidos de adesão</h3>
              </div>

              {loadingJoinRequests ? (
                <div className="soft-box">A carregar adesões...</div>
              ) : joinRequests.length === 0 ? (
                <div className="soft-box">Não há pedidos de adesão pendentes.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudante</th>
                        <th>Sessão</th>
                        <th>Data Pedido</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {joinRequests.map((jr) => (
                        <tr key={jr.joinRequestId}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{jr.student?.firstName} {jr.student?.lastName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--studio-muted)' }}>{jr.student?.email}</div>
                          </td>
                          <td>
                            <div>Sessão #{jr.sessionId}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--studio-muted)' }}>{jr.modalityName}</div>
                          </td>
                          <td>{formatDate(jr.requestedAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="moderation-action-btn approve"
                                disabled={loadingId === jr.joinRequestId}
                                onClick={() => handleApproveJoin(jr.joinRequestId)}
                              >
                                {loadingId === jr.joinRequestId ? '...' : 'Aprovar'}
                              </button>
                              <button
                                type="button"
                                className="moderation-action-btn reject"
                                disabled={loadingId === jr.joinRequestId}
                                onClick={() => handleRejectJoin(jr.joinRequestId)}
                              >
                                Rejeitar
                              </button>
                            </div>
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
