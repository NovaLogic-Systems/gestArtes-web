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
import { listAdminCoachingRequests, reviewRequestAsAdmin, getCompatibleStudiosForRequest, listAdminGroupProposals, getCompatibleStudiosForGroupProposal, reviewGroupProposalAsAdmin } from '../../services/coaching'
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

  // Individual coaching requests (student→teacher→admin flow)
  const [coachingRequests, setCoachingRequests] = useState([])
  const [loadingCoachingRequests, setLoadingCoachingRequests] = useState(true)
  const [selectedCoachingRequest, setSelectedCoachingRequest] = useState(null)
  const [compatibleStudios, setCompatibleStudios] = useState([])
  const [loadingStudios, setLoadingStudios] = useState(false)
  const [selectedStudioId, setSelectedStudioId] = useState(null)
  const [coachingAdminDecision, setCoachingAdminDecision] = useState('approve')
  const [coachingAdminNotes, setCoachingAdminNotes] = useState('')
  const [coachingAdminError, setCoachingAdminError] = useState('')
  const [coachingAdminSaving, setCoachingAdminSaving] = useState(false)

  // Group coaching proposals
  const [groupProposals, setGroupProposals] = useState([])
  const [loadingGroupProposals, setLoadingGroupProposals] = useState(true)
  const [selectedGroupProposal, setSelectedGroupProposal] = useState(null)
  const [groupCompatibleStudios, setGroupCompatibleStudios] = useState([])
  const [loadingGroupStudios, setLoadingGroupStudios] = useState(false)
  const [selectedGroupStudioId, setSelectedGroupStudioId] = useState(null)
  const [groupAdminDecision, setGroupAdminDecision] = useState('approve')
  const [groupAdminNotes, setGroupAdminNotes] = useState('')
  const [groupAdminError, setGroupAdminError] = useState('')
  const [groupAdminSaving, setGroupAdminSaving] = useState(false)

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

  const loadCoachingRequests = useCallback(async () => {
    setLoadingCoachingRequests(true)
    try {
      const items = await listAdminCoachingRequests()
      setCoachingRequests(Array.isArray(items) ? items : [])
    } catch {
      setCoachingRequests([])
    } finally {
      setLoadingCoachingRequests(false)
    }
  }, [])

  const loadGroupProposals = useCallback(async () => {
    setLoadingGroupProposals(true)
    try {
      const items = await listAdminGroupProposals()
      setGroupProposals(Array.isArray(items) ? items : [])
    } catch {
      setGroupProposals([])
    } finally {
      setLoadingGroupProposals(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadBookings(), loadFinalizations(), loadJoinRequests(), loadCoachingRequests(), loadGroupProposals()])
    return undefined
  }, [loadBookings, loadFinalizations, loadJoinRequests, loadCoachingRequests, loadGroupProposals])

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

  const openGroupApprovalModal = async (proposal) => {
    setSelectedGroupProposal(proposal)
    setGroupAdminDecision('approve')
    setGroupAdminNotes('')
    setGroupAdminError('')
    setSelectedGroupStudioId(null)
    setGroupCompatibleStudios([])
    setLoadingGroupStudios(true)
    try {
      const studios = await getCompatibleStudiosForGroupProposal(proposal.proposalId)
      setGroupCompatibleStudios(studios)
      const first = studios.find((s) => s.isAvailable)
      if (first) setSelectedGroupStudioId(first.studioId)
    } catch {
      setGroupCompatibleStudios([])
    } finally {
      setLoadingGroupStudios(false)
    }
  }

  const closeGroupApprovalModal = () => {
    if (groupAdminSaving) return
    setSelectedGroupProposal(null)
    setGroupAdminError('')
  }

  const handleGroupAdminSubmit = async () => {
    if (!selectedGroupProposal || groupAdminSaving) return
    if (groupAdminDecision === 'approve' && !selectedGroupStudioId) {
      setGroupAdminError('Seleciona um estúdio antes de aprovar.')
      return
    }
    setGroupAdminSaving(true)
    setGroupAdminError('')
    try {
      await reviewGroupProposalAsAdmin(selectedGroupProposal.proposalId, {
        decision: groupAdminDecision,
        notes: groupAdminNotes.trim() || undefined,
        studioId: groupAdminDecision === 'approve' ? selectedGroupStudioId : undefined,
      })
      setGroupProposals((prev) => prev.filter((p) => p.proposalId !== selectedGroupProposal.proposalId))
      setSelectedGroupProposal(null)
      setNotice(groupAdminDecision === 'approve' ? 'Sessão de grupo aprovada e criada.' : 'Proposta de grupo rejeitada.')
    } catch (err) {
      setGroupAdminError(err?.response?.data?.error || err?.message || 'Erro ao processar proposta.')
    } finally {
      setGroupAdminSaving(false)
    }
  }

  const openCoachingApprovalModal = async (req) => {
    setSelectedCoachingRequest(req)
    setCoachingAdminDecision('approve')
    setCoachingAdminNotes('')
    setCoachingAdminError('')
    setSelectedStudioId(null)
    setCompatibleStudios([])
    setLoadingStudios(true)
    try {
      const studios = await getCompatibleStudiosForRequest(req.requestId)
      setCompatibleStudios(studios)
      const firstAvailable = studios.find((s) => s.isAvailable)
      if (firstAvailable) setSelectedStudioId(firstAvailable.studioId)
    } catch {
      setCompatibleStudios([])
    } finally {
      setLoadingStudios(false)
    }
  }

  const closeCoachingApprovalModal = () => {
    if (coachingAdminSaving) return
    setSelectedCoachingRequest(null)
    setCoachingAdminError('')
  }

  const handleCoachingAdminSubmit = async () => {
    if (!selectedCoachingRequest || coachingAdminSaving) return
    if (coachingAdminDecision === 'approve' && !selectedStudioId) {
      setCoachingAdminError('Seleciona um estúdio antes de aprovar.')
      return
    }
    setCoachingAdminSaving(true)
    setCoachingAdminError('')
    try {
      await reviewRequestAsAdmin(selectedCoachingRequest.requestId, {
        decision: coachingAdminDecision,
        notes: coachingAdminNotes.trim() || undefined,
        studioId: coachingAdminDecision === 'approve' ? selectedStudioId : undefined,
      })
      setCoachingRequests((prev) => prev.filter((r) => r.requestId !== selectedCoachingRequest.requestId))
      setSelectedCoachingRequest(null)
      setNotice(coachingAdminDecision === 'approve' ? 'Pedido de coaching aprovado e aula criada.' : 'Pedido de coaching rejeitado.')
    } catch (err) {
      setCoachingAdminError(err?.response?.data?.error || err?.message || 'Erro ao processar pedido.')
    } finally {
      setCoachingAdminSaving(false)
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={activeTab === 'bookings' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('bookings')}
            >
              Sessões (professor){bookings.length > 0 ? ` · ${bookings.length}` : ''}
            </button>
            <button
              type="button"
              className={activeTab === 'coaching-requests' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('coaching-requests')}
            >
              Aulas Individuais{coachingRequests.length > 0 ? ` · ${coachingRequests.length}` : ''}
            </button>
            <button
              type="button"
              className={activeTab === 'group-proposals' ? 'cta' : 'ghost-btn'}
              onClick={() => setActiveTab('group-proposals')}
            >
              Grupos{groupProposals.length > 0 ? ` · ${groupProposals.length}` : ''}
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
                  <h3>Sessões abertas pelo professor — aprovação pendente</h3>
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

          {/* Tab 1b — Aulas Individuais (coaching requests PENDING_ADMIN_APPROVAL) */}
          {activeTab === 'coaching-requests' ? (
            <article className="panel">
              <div className="panel-header">
                <h3>Pedidos de aula individual — aprovação final</h3>
                <div className="card-actions">
                  <button type="button" className="ghost-btn" onClick={loadCoachingRequests}>Recarregar</button>
                </div>
              </div>
              <p style={{ margin: '0 0 1rem', color: 'var(--studio-muted)', fontSize: '0.88rem' }}>
                Pedidos aprovados pelo professor que aguardam confirmação da direção. Escolhe o estúdio e aprova ou rejeita.
              </p>

              {loadingCoachingRequests ? (
                <div className="soft-box">A carregar pedidos...</div>
              ) : coachingRequests.length === 0 ? (
                <div className="soft-box">Não há pedidos de aula individual pendentes de aprovação.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Aluno</th>
                        <th>Professor</th>
                        <th>Modalidade</th>
                        <th>Data / Hora</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachingRequests.map((req) => (
                        <tr key={req.requestId}>
                          <td>
                            <strong>#{req.requestId}</strong>
                            <br />
                            <small>{formatDate(req.requestedAt)}</small>
                          </td>
                          <td>
                            <strong>{[req.student?.firstName, req.student?.lastName].filter(Boolean).join(' ') || '—'}</strong>
                            {req.student?.email ? <><br /><small>{req.student.email}</small></> : null}
                          </td>
                          <td>
                            <strong>{[req.teacher?.firstName, req.teacher?.lastName].filter(Boolean).join(' ') || '—'}</strong>
                          </td>
                          <td>{req.modalityName || '—'}</td>
                          <td>
                            <strong>{req.currentStartTime ? new Date(req.currentStartTime).toLocaleDateString('pt-PT') : '—'}</strong>
                            <br />
                            <small>
                              {req.currentStartTime ? new Date(req.currentStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {req.currentEndTime ? ` → ${new Date(req.currentEndTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </small>
                          </td>
                          <td>
                            <button type="button" className="moderation-action-btn approve" onClick={() => openCoachingApprovalModal(req)}>
                              Rever
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

          {/* Tab 1c — Grupos (GroupCoachingProposal PENDING_ADMIN_APPROVAL) */}
          {activeTab === 'group-proposals' ? (
            <article className="panel">
              <div className="panel-header">
                <h3>Propostas de sessão de grupo — aprovação final</h3>
                <div className="card-actions">
                  <button type="button" className="ghost-btn" onClick={loadGroupProposals}>Recarregar</button>
                </div>
              </div>
              <p style={{ margin: '0 0 1rem', color: 'var(--studio-muted)', fontSize: '0.88rem' }}>
                Sessões de grupo criadas pelo professor. Escolhe o estúdio e aprova ou rejeita.
              </p>
              {loadingGroupProposals ? (
                <div className="soft-box">A carregar propostas...</div>
              ) : groupProposals.length === 0 ? (
                <div className="soft-box">Não há propostas de grupo pendentes.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Proposta</th>
                        <th>Professor</th>
                        <th>Modalidade</th>
                        <th>Data / Hora</th>
                        <th>Alunos</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupProposals.map((gp) => (
                        <tr key={gp.proposalId}>
                          <td>
                            <strong>#{gp.proposalId}</strong>
                            <br /><small>{formatDate(gp.requestedAt)}</small>
                          </td>
                          <td>
                            <strong>{[gp.teacher?.firstName, gp.teacher?.lastName].filter(Boolean).join(' ') || '—'}</strong>
                          </td>
                          <td>{gp.modalityName || '—'}</td>
                          <td>
                            <strong>{gp.startTime ? new Date(gp.startTime).toLocaleDateString('pt-PT') : '—'}</strong>
                            <br /><small>
                              {gp.startTime ? new Date(gp.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {gp.endTime ? ` → ${new Date(gp.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </small>
                          </td>
                          <td>
                            <strong>{gp.participants.length} aluno{gp.participants.length !== 1 ? 's' : ''}</strong>
                            <br /><small style={{ color: 'var(--studio-muted)' }}>
                              {gp.participants.slice(0, 3).map((p) => [p.student?.firstName, p.student?.lastName].filter(Boolean).join(' ')).join(', ')}
                              {gp.participants.length > 3 ? ` +${gp.participants.length - 3}` : ''}
                            </small>
                          </td>
                          <td>
                            <button type="button" className="moderation-action-btn approve" onClick={() => openGroupApprovalModal(gp)}>
                              Rever
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

      {selectedGroupProposal ? (
        <Modal open onClose={closeGroupApprovalModal} title={`Proposta de grupo #${selectedGroupProposal.proposalId} — Aprovação`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
              {[
                { label: 'Professor', value: [selectedGroupProposal.teacher?.firstName, selectedGroupProposal.teacher?.lastName].filter(Boolean).join(' ') || '—' },
                { label: 'Modalidade', value: selectedGroupProposal.modalityName || '—' },
                { label: 'Horário', value: selectedGroupProposal.startTime ? `${new Date(selectedGroupProposal.startTime).toLocaleDateString('pt-PT')} · ${new Date(selectedGroupProposal.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} → ${new Date(selectedGroupProposal.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--studio-soft-bg)', border: '1px solid var(--studio-soft-line)', borderRadius: '0.9rem', padding: '0.7rem 0.85rem' }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--studio-muted)' }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--studio-ink)', marginTop: '0.2rem' }}>{value}</div>
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Alunos ({selectedGroupProposal.participants.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedGroupProposal.participants.map((p) => (
                  <span key={p.participantId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', border: '1px solid var(--studio-field-line)', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, background: '#fff', color: 'var(--studio-ink)' }}>
                    {[p.student?.firstName, p.student?.lastName].filter(Boolean).join(' ') || '—'}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Decisão</label>
              <div style={{ display: 'inline-flex', gap: '0.5rem', padding: '0.35rem', border: '1px solid var(--studio-soft-line)', borderRadius: '999px', background: 'var(--studio-soft-bg)' }}>
                {['approve', 'reject'].map((d) => (
                  <button key={d} type="button" onClick={() => setGroupAdminDecision(d)} style={{
                    border: groupAdminDecision === d ? (d === 'approve' ? '1px solid color-mix(in srgb, var(--studio-cta-start) 48%, #fff 52%)' : '1px solid var(--studio-danger-line)') : '1px solid transparent',
                    borderRadius: '999px', cursor: 'pointer', font: 'inherit', fontWeight: 600, padding: '0.6rem 0.95rem',
                    background: groupAdminDecision === d ? (d === 'approve' ? 'linear-gradient(135deg, rgba(11,157,143,0.18), rgba(16,178,163,0.1))' : 'var(--studio-danger-bg)') : 'transparent',
                    color: groupAdminDecision === d ? (d === 'approve' ? '#0a7a70' : 'var(--studio-danger-ink)') : 'var(--studio-ink)',
                  }}>
                    {d === 'approve' ? 'Aprovar' : 'Rejeitar'}
                  </button>
                ))}
              </div>
            </div>

            {groupAdminDecision === 'approve' ? (
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Estúdio {loadingGroupStudios ? '(a carregar...)' : `— ${groupCompatibleStudios.length} compatíveis`}
                </label>
                {loadingGroupStudios ? (
                  <div style={{ color: 'var(--studio-muted)', fontSize: '0.9rem' }}>A verificar disponibilidade...</div>
                ) : groupCompatibleStudios.length === 0 ? (
                  <div style={{ color: 'var(--studio-error-ink)', fontSize: '0.9rem' }}>Nenhum estúdio compatível encontrado.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {groupCompatibleStudios.map((studio) => (
                      <label key={studio.studioId} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer',
                        border: `2px solid ${selectedGroupStudioId === studio.studioId ? 'var(--studio-cta-start)' : studio.isAvailable ? 'var(--studio-soft-line)' : 'var(--studio-error-line)'}`,
                        borderRadius: '0.9rem',
                        background: selectedGroupStudioId === studio.studioId ? 'linear-gradient(135deg,rgba(11,157,143,0.12),rgba(16,178,163,0.06))' : studio.isAvailable ? 'var(--studio-soft-bg)' : 'var(--studio-error-bg)',
                      }}>
                        <input type="radio" name="group-studio-select" value={studio.studioId} checked={selectedGroupStudioId === studio.studioId} onChange={() => setSelectedGroupStudioId(studio.studioId)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--studio-ink)' }}>{studio.studioName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--studio-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                            <span>Cap. {studio.capacity ?? '—'}</span>
                            <span>Hoje: {studio.dailySessionCount}</span>
                            <span>±2h: {studio.nearbySessionCount}</span>
                          </div>
                        </div>
                        <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', background: studio.isAvailable ? 'color-mix(in srgb,var(--studio-cta-start) 15%,#fff 85%)' : 'var(--studio-error-bg)', color: studio.isAvailable ? '#0a7a70' : 'var(--studio-error-ink)', border: `1px solid ${studio.isAvailable ? 'color-mix(in srgb,var(--studio-cta-start) 40%,#fff 60%)' : 'var(--studio-error-line)'}` }}>
                          {studio.isAvailable ? 'Disponível' : `${studio.conflictCount} conflito${studio.conflictCount > 1 ? 's' : ''}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Notas (opcional)</label>
              <textarea value={groupAdminNotes} onChange={(e) => setGroupAdminNotes(e.target.value)} rows={2} placeholder="Notas para o professor e alunos..." style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.9rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', resize: 'vertical', color: 'var(--studio-ink)' }} />
            </div>

            {groupAdminError ? (
              <div style={{ padding: '0.75rem 0.9rem', background: 'var(--studio-error-bg)', border: '1px solid var(--studio-error-line)', borderRadius: '0.9rem', color: 'var(--studio-error-ink)', fontSize: '0.88rem' }} role="alert">
                {groupAdminError}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={closeGroupApprovalModal} disabled={groupAdminSaving}>Cancelar</Button>
              <Button variant={groupAdminDecision === 'approve' ? 'cta' : 'danger'} onClick={handleGroupAdminSubmit} disabled={groupAdminSaving || (groupAdminDecision === 'approve' && !selectedGroupStudioId)}>
                {groupAdminSaving ? 'A processar...' : groupAdminDecision === 'approve' ? `Aprovar grupo (${selectedGroupProposal.participants.length} alunos)` : 'Rejeitar proposta'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {selectedCoachingRequest ? (
        <Modal open onClose={closeCoachingApprovalModal} title={`Pedido #${selectedCoachingRequest.requestId} — Aprovação final`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
              {[
                { label: 'Aluno', value: [selectedCoachingRequest.student?.firstName, selectedCoachingRequest.student?.lastName].filter(Boolean).join(' ') || '—' },
                { label: 'Professor', value: [selectedCoachingRequest.teacher?.firstName, selectedCoachingRequest.teacher?.lastName].filter(Boolean).join(' ') || '—' },
                { label: 'Modalidade', value: selectedCoachingRequest.modalityName || '—' },
                { label: 'Horário confirmado', value: selectedCoachingRequest.currentStartTime
                  ? `${new Date(selectedCoachingRequest.currentStartTime).toLocaleDateString('pt-PT')} · ${new Date(selectedCoachingRequest.currentStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}${selectedCoachingRequest.currentEndTime ? ` → ${new Date(selectedCoachingRequest.currentEndTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                  : '—' },
                ...(selectedCoachingRequest.preferredStartTime &&
                  selectedCoachingRequest.currentStartTime &&
                  new Date(selectedCoachingRequest.preferredStartTime).getTime() !== new Date(selectedCoachingRequest.currentStartTime).getTime()
                  ? [{ label: 'Pedido originalmente', value: `${new Date(selectedCoachingRequest.preferredStartTime).toLocaleDateString('pt-PT')} · ${new Date(selectedCoachingRequest.preferredStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}${selectedCoachingRequest.preferredEndTime ? ` → ${new Date(selectedCoachingRequest.preferredEndTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}` }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--studio-soft-bg)', border: '1px solid var(--studio-soft-line)', borderRadius: '0.9rem', padding: '0.7rem 0.85rem' }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--studio-muted)' }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--studio-ink)', marginTop: '0.2rem' }}>{value}</div>
                </div>
              ))}
            </div>

            {selectedCoachingRequest.requestNotes || selectedCoachingRequest.teacherResponseNotes || selectedCoachingRequest.studentResponseNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedCoachingRequest.requestNotes ? (
                  <div style={{ background: 'var(--studio-soft-bg)', border: '1px solid var(--studio-soft-line)', borderRadius: '0.9rem', padding: '0.7rem 0.85rem' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--studio-muted)', marginBottom: '0.2rem' }}>Notas do aluno</div>
                    <div style={{ color: 'var(--studio-ink)' }}>{selectedCoachingRequest.requestNotes}</div>
                  </div>
                ) : null}
                {selectedCoachingRequest.teacherResponseNotes ? (
                  <div style={{ background: 'var(--studio-soft-bg)', border: '1px solid var(--studio-soft-line)', borderRadius: '0.9rem', padding: '0.7rem 0.85rem' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--studio-muted)', marginBottom: '0.2rem' }}>Resposta do professor</div>
                    <div style={{ color: 'var(--studio-ink)' }}>{selectedCoachingRequest.teacherResponseNotes}</div>
                  </div>
                ) : null}
                {selectedCoachingRequest.studentResponseNotes ? (
                  <div style={{ background: 'var(--studio-soft-bg)', border: '1px solid var(--studio-soft-line)', borderRadius: '0.9rem', padding: '0.7rem 0.85rem' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--studio-muted)', marginBottom: '0.2rem' }}>Resposta do aluno à sugestão</div>
                    <div style={{ color: 'var(--studio-ink)' }}>{selectedCoachingRequest.studentResponseNotes}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Decisão</label>
              <div style={{ display: 'inline-flex', gap: '0.5rem', padding: '0.35rem', border: '1px solid var(--studio-soft-line)', borderRadius: '999px', background: 'var(--studio-soft-bg)' }}>
                <button
                  type="button"
                  onClick={() => setCoachingAdminDecision('approve')}
                  style={{
                    border: coachingAdminDecision === 'approve' ? '1px solid color-mix(in srgb, var(--studio-cta-start) 32%, #ffffff 68%)' : '1px solid transparent',
                    borderRadius: '999px',
                    background: coachingAdminDecision === 'approve' ? 'linear-gradient(135deg, rgba(11, 157, 143, 0.18), rgba(16, 178, 163, 0.1))' : 'transparent',
                    color: coachingAdminDecision === 'approve' ? '#0a7a70' : 'var(--studio-ghost-ink)',
                    cursor: 'pointer', font: 'inherit', fontWeight: 600, padding: '0.6rem 0.95rem',
                  }}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => setCoachingAdminDecision('reject')}
                  style={{
                    border: coachingAdminDecision === 'reject' ? '1px solid var(--studio-danger-line)' : '1px solid transparent',
                    borderRadius: '999px',
                    background: coachingAdminDecision === 'reject' ? 'var(--studio-danger-bg)' : 'transparent',
                    color: coachingAdminDecision === 'reject' ? 'var(--studio-danger-ink)' : 'var(--studio-ghost-ink)',
                    cursor: 'pointer', font: 'inherit', fontWeight: 600, padding: '0.6rem 0.95rem',
                  }}
                >
                  Rejeitar
                </button>
              </div>
            </div>

            {coachingAdminDecision === 'approve' ? (
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Estúdio {loadingStudios ? '(a carregar...)' : `— ${compatibleStudios.length} compatíveis`}
                </label>
                {loadingStudios ? (
                  <div style={{ color: 'var(--studio-muted)', fontSize: '0.9rem' }}>A verificar disponibilidade dos estúdios...</div>
                ) : compatibleStudios.length === 0 ? (
                  <div style={{ color: 'var(--studio-error-ink)', fontSize: '0.9rem' }}>Nenhum estúdio compatível encontrado.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {compatibleStudios.map((studio) => (
                      <label
                        key={studio.studioId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          border: `2px solid ${selectedStudioId === studio.studioId ? 'var(--studio-cta-start)' : studio.isAvailable ? 'var(--studio-soft-line)' : 'var(--studio-error-line)'}`,
                          borderRadius: '0.9rem',
                          background: selectedStudioId === studio.studioId
                            ? 'linear-gradient(135deg, rgba(11, 157, 143, 0.12), rgba(16, 178, 163, 0.06))'
                            : studio.isAvailable ? 'var(--studio-soft-bg)' : 'var(--studio-error-bg)',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <input
                          type="radio"
                          name="studio-select"
                          value={studio.studioId}
                          checked={selectedStudioId === studio.studioId}
                          onChange={() => setSelectedStudioId(studio.studioId)}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--studio-ink)' }}>{studio.studioName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--studio-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            <span>Capacidade: {studio.capacity ?? '—'}</span>
                            <span>Aulas hoje: {studio.dailySessionCount}</span>
                            <span>±2h: {studio.nearbySessionCount}</span>
                          </div>
                        </div>
                        <span style={{
                          padding: '3px 9px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                          background: studio.isAvailable ? 'color-mix(in srgb, var(--studio-cta-start) 15%, #fff 85%)' : 'var(--studio-error-bg)',
                          color: studio.isAvailable ? '#0a7a70' : 'var(--studio-error-ink)',
                          border: `1px solid ${studio.isAvailable ? 'color-mix(in srgb, var(--studio-cta-start) 40%, #fff 60%)' : 'var(--studio-error-line)'}`,
                        }}>
                          {studio.isAvailable ? 'Disponível' : `${studio.conflictCount} conflito${studio.conflictCount > 1 ? 's' : ''}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Notas {coachingAdminDecision === 'reject' ? <span style={{ color: '#b91c1c' }}>(obrigatórias)</span> : '(opcional)'}
              </label>
              <textarea
                value={coachingAdminNotes}
                onChange={(e) => setCoachingAdminNotes(e.target.value)}
                rows={3}
                placeholder={coachingAdminDecision === 'reject' ? 'Indica o motivo da rejeição...' : 'Notas adicionais...'}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.9rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', color: 'var(--studio-ink)', resize: 'vertical' }}
              />
            </div>

            {coachingAdminError ? (
              <div style={{ padding: '0.75rem 0.9rem', background: 'var(--studio-error-bg)', border: '1px solid var(--studio-error-line)', borderRadius: '0.9rem', color: 'var(--studio-error-ink)', fontSize: '0.88rem' }} role="alert">
                {coachingAdminError}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={closeCoachingApprovalModal} disabled={coachingAdminSaving}>Cancelar</Button>
              <Button
                variant={coachingAdminDecision === 'approve' ? 'cta' : 'danger'}
                onClick={handleCoachingAdminSubmit}
                disabled={coachingAdminSaving || (coachingAdminDecision === 'approve' && !selectedStudioId)}
              >
                {coachingAdminSaving ? 'A processar...' : coachingAdminDecision === 'approve' ? 'Confirmar e criar aula' : 'Rejeitar pedido'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

export default ValidationsPage
