/**
 * @file src/pages/teacher/TeacherCoachingPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  listTeacherCoachingRequests,
  reviewRequestAsTeacher,
  listTeacherGroupProposals,
  createGroupProposal,
  searchStudentsForGroup,
  listCoachingModalities,
} from '../../services/coaching'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import UnavailabilityModal from '../../components/teacher/UnavailabilityModal'
import '../admin-studios.css'
import './TeacherCoachingPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import { localizeApiError } from '../../utils/apiErrors'
import { reportTeacherAbsence } from '../../services/teacherAvailability'

function toInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-PT')
}

function formatTime(value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(parsed)
}

function toLocalInputDateTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

const DEFAULT_COACHING_DURATION_MIN = 60
const COACHING_DURATIONS = [45, 60, 90, 120]

function resolveDurationMinutes(startValue, endValue, fallback = DEFAULT_COACHING_DURATION_MIN) {
  if (!startValue || !endValue) return fallback
  const start = new Date(startValue)
  const end = new Date(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fallback
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
  return minutes > 0 ? minutes : fallback
}

function addMinutes(value, minutes) {
  const parsed = new Date(value)
  const parsedMinutes = Number(minutes)
  if (Number.isNaN(parsed.getTime()) || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) return null
  return new Date(parsed.getTime() + parsedMinutes * 60000)
}

function formatTimeLabel(value) {
  if (!value) return '—'
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

export default function TeacherCoachingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toast, setToast] = useState(null)
  const [unavailabilityOpen, setUnavailabilityOpen] = useState(false)
  const [unavailabilitySaving, setUnavailabilitySaving] = useState(false)

  // Coaching individual requests (student→teacher flow)
  const [coachingReqs, setCoachingReqs] = useState([])
  const [loadingCoaching, setLoadingCoaching] = useState(true)
  const [selectedCoachingReq, setSelectedCoachingReq] = useState(null)
  const [coachingDecision, setCoachingDecision] = useState('approve')
  const [coachingNotes, setCoachingNotes] = useState('')
  const [coachingDurationMin, setCoachingDurationMin] = useState(String(DEFAULT_COACHING_DURATION_MIN))
  const [coachingSuggestStart, setCoachingSuggestStart] = useState('')
  const [coachingSuggestDurationMin, setCoachingSuggestDurationMin] = useState(String(DEFAULT_COACHING_DURATION_MIN))
  const [coachingReviewError, setCoachingReviewError] = useState('')
  const [coachingSaving, setCoachingSaving] = useState(false)

  // Group proposals
  const [groupProposals, setGroupProposals] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupModalMode, setGroupModalMode] = useState('scratch') // 'scratch' | 'from-requests'
  const [groupSelectedRequestIds, setGroupSelectedRequestIds] = useState([])
  const [groupStudents, setGroupStudents] = useState([]) // { userId, firstName, lastName, email, sourceRequestId? }
  const [groupModalityId, setGroupModalityId] = useState('')
  const [groupStartTime, setGroupStartTime] = useState('')
  const [groupEndTime, setGroupEndTime] = useState('')
  const [groupNotes, setGroupNotes] = useState('')
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [groupSearchResults, setGroupSearchResults] = useState([])
  const [groupSearching, setGroupSearching] = useState(false)
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [modalities, setModalities] = useState([])

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellCls = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarCls = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const update = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setMobileOpen(false)
    }
    update()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  const loadCoachingRequests = useCallback(async () => {
    setLoadingCoaching(true)
    try {
      const items = await listTeacherCoachingRequests()
      setCoachingReqs(Array.isArray(items) ? items : [])
    } catch {
      setCoachingReqs([])
    } finally {
      setLoadingCoaching(false)
    }
  }, [])

  const loadGroupProposals = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const items = await listTeacherGroupProposals()
      setGroupProposals(Array.isArray(items) ? items : [])
    } catch {
      setGroupProposals([])
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    void loadCoachingRequests()
    void loadGroupProposals()
  }, [loadCoachingRequests, loadGroupProposals])

  // Load modalities for group form — loaded once on mount
  useEffect(() => {
    listCoachingModalities().then((items) => setModalities(Array.isArray(items) ? items : [])).catch(() => {})
  }, [])

  const openGroupModal = useCallback((mode) => {
    setGroupModalMode(mode)
    setGroupModalOpen(true)
    setGroupStudents([])
    setGroupSelectedRequestIds([])
    setGroupModalityId('')
    setGroupStartTime('')
    setGroupEndTime('')
    setGroupNotes('')
    setGroupSearchQuery('')
    setGroupSearchResults([])
    setGroupError('')
    if (mode === 'from-requests') {
      // Pre-fill with PENDING_TEACHER_REVIEW coaching requests
    }
  }, [])

  const closeGroupModal = useCallback(() => {
    if (groupSaving) return
    setGroupModalOpen(false)
    setGroupError('')
  }, [groupSaving])

  const handleGroupStudentSearch = useCallback(async (q) => {
    setGroupSearchQuery(q)
    if (q.trim().length < 2) { setGroupSearchResults([]); return }
    setGroupSearching(true)
    try {
      const results = await searchStudentsForGroup(q.trim())
      setGroupSearchResults(Array.isArray(results) ? results : [])
    } catch {
      setGroupSearchResults([])
    } finally {
      setGroupSearching(false)
    }
  }, [])

  const addGroupStudent = useCallback((student) => {
    setGroupStudents((prev) => {
      if (prev.some((s) => s.userId === student.userId)) return prev
      return [...prev, student]
    })
    setGroupSearchQuery('')
    setGroupSearchResults([])
  }, [])

  const removeGroupStudent = useCallback((userId) => {
    setGroupStudents((prev) => prev.filter((s) => s.userId !== userId))
  }, [])

  const toggleRequestForGroup = useCallback((req) => {
    const isSelected = groupSelectedRequestIds.includes(req.requestId)
    if (isSelected) {
      setGroupSelectedRequestIds((prev) => prev.filter((id) => id !== req.requestId))
      setGroupStudents((prev) => prev.filter((s) => s.sourceRequestId !== req.requestId))
    } else {
      setGroupSelectedRequestIds((prev) => [...prev, req.requestId])
      const student = {
        userId: req.student?.userId,
        firstName: req.student?.firstName,
        lastName: req.student?.lastName,
        email: req.student?.email,
        sourceRequestId: req.requestId,
      }
      setGroupStudents((prev) => {
        if (!student.userId || prev.some((s) => s.userId === student.userId)) return prev
        return [...prev, student]
      })
      // Auto-fill modality/time from request if not set
      if (!groupModalityId && req.modalityId) setGroupModalityId(String(req.modalityId))
      if (!groupStartTime && req.currentStartTime) {
        setGroupStartTime(new Date(req.currentStartTime).toISOString().slice(0, 16))
      }
      if (!groupEndTime && req.currentEndTime) {
        setGroupEndTime(new Date(req.currentEndTime).toISOString().slice(0, 16))
      }
    }
  }, [groupSelectedRequestIds, groupModalityId, groupStartTime, groupEndTime])

  const handleGroupSubmit = useCallback(async () => {
    if (groupSaving) return
    setGroupError('')
    if (groupStudents.length < 2) { setGroupError('Seleciona pelo menos 2 alunos.'); return }
    if (groupStudents.length > 8) { setGroupError('O máximo é 8 participantes por sessão de grupo.'); return }
    if (!groupModalityId) { setGroupError('Escolhe a modalidade.'); return }
    if (!groupStartTime || !groupEndTime) { setGroupError('Define o horário da sessão.'); return }
    if (new Date(groupEndTime) <= new Date(groupStartTime)) { setGroupError('Hora de fim deve ser depois do início.'); return }

    setGroupSaving(true)
    try {
      await createGroupProposal({
        modalityId: Number(groupModalityId),
        startTime: new Date(groupStartTime).toISOString(),
        endTime: new Date(groupEndTime).toISOString(),
        notes: groupNotes.trim() || undefined,
        studentUserIds: groupStudents.filter((s) => !s.sourceRequestId).map((s) => s.userId),
        sourceRequestIds: groupSelectedRequestIds,
      })
      setGroupModalOpen(false)
      setToast({ variant: 'success', title: 'Proposta de grupo criada', description: 'A direção vai receber a proposta para aprovação.' })
      void loadGroupProposals()
      void loadCoachingRequests()
    } catch (err) {
      setGroupError(localizeApiError(err, 'Não foi possível criar a sessão de grupo.'))
    } finally {
      setGroupSaving(false)
    }
  }, [groupSaving, groupStudents, groupModalityId, groupStartTime, groupEndTime, groupNotes, groupSelectedRequestIds, loadGroupProposals, loadCoachingRequests])

  const openCoachingReq = useCallback((req) => {
    const preferredStart = req.preferredStartTime ?? req.currentStartTime
    const preferredEnd = req.preferredEndTime ?? req.currentEndTime
    const startIso = preferredStart ? toLocalInputDateTime(preferredStart) : ''
    const durationMinutes = resolveDurationMinutes(preferredStart, preferredEnd)
    const durationValue = COACHING_DURATIONS.includes(durationMinutes)
      ? durationMinutes
      : DEFAULT_COACHING_DURATION_MIN
    const durationLabel = String(durationValue)

    setSelectedCoachingReq(req)
    setCoachingDecision('approve')
    setCoachingNotes('')
    setCoachingDurationMin(durationLabel)
    setCoachingSuggestStart(startIso)
    setCoachingSuggestDurationMin(durationLabel)
    setCoachingReviewError('')
  }, [])

  const closeCoachingModal = useCallback(() => {
    if (coachingSaving) return
    setSelectedCoachingReq(null)
    setCoachingReviewError('')
  }, [coachingSaving])

  const handleCoachingReviewSubmit = useCallback(async () => {
    if (!selectedCoachingReq || coachingSaving) return
    setCoachingReviewError('')

    const payload = { decision: coachingDecision, notes: coachingNotes.trim() || undefined }

    if (coachingDecision === 'approve') {
      const needsEndTime = !selectedCoachingReq.currentEndTime
      if (needsEndTime) {
        const durationValue = Number(coachingDurationMin)
        const endDate = addMinutes(selectedCoachingReq.currentStartTime, durationValue)
        if (!durationValue || !endDate) {
          setCoachingReviewError('Define a duração da aula antes de aprovar.')
          return
        }
        payload.approvedStartTime = selectedCoachingReq.currentStartTime
        payload.approvedEndTime = endDate.toISOString()
      }
    } else if (coachingDecision === 'suggest') {
      const durationValue = Number(coachingSuggestDurationMin)
      const endDate = addMinutes(coachingSuggestStart, durationValue)
      if (!coachingSuggestStart || !durationValue || !endDate) {
        setCoachingReviewError('Preenche a data/hora de início e a duração da sugestão.')
        return
      }
      payload.suggestedStartTime = new Date(coachingSuggestStart).toISOString()
      payload.suggestedEndTime = endDate.toISOString()
    } else if (coachingDecision === 'reject') {
      if (!payload.notes) {
        setCoachingReviewError('Notas são obrigatórias ao rejeitar.')
        return
      }
    }

    setCoachingSaving(true)
    try {
      await reviewRequestAsTeacher(selectedCoachingReq.requestId, payload)
      setCoachingReqs((prev) => prev.filter((r) => r.requestId !== selectedCoachingReq.requestId))
      setSelectedCoachingReq(null)
      setToast({
        variant: 'success',
        title: coachingDecision === 'approve' ? 'Pedido aprovado' : coachingDecision === 'suggest' ? 'Sugestão enviada' : 'Pedido rejeitado',
        description: coachingDecision === 'approve'
          ? 'O pedido seguiu para aprovação final pela direção.'
          : coachingDecision === 'suggest'
            ? 'O aluno será notificado com a tua proposta de horário.'
            : 'O aluno foi notificado.',
      })
    } catch (err) {
      setCoachingReviewError(localizeApiError(err, 'Não foi possível processar a decisão.'))
    } finally {
      setCoachingSaving(false)
    }
  }, [selectedCoachingReq, coachingSaving, coachingDecision, coachingNotes, coachingDurationMin, coachingSuggestStart, coachingSuggestDurationMin])

  const handleUnavailabilitySubmit = useCallback(async ({ reason, slotData }) => {
    if (unavailabilitySaving) return

    setUnavailabilitySaving(true)
    try {
      await reportTeacherAbsence({
        startDateTime: slotData?.startDateTime,
        endDateTime: slotData?.endDateTime,
        reason,
      })
      setUnavailabilityOpen(false)
      setToast({
        variant: 'success',
        title: 'Indisponibilidade marcada',
        description: 'A indisponibilidade ficou registada para esse horário.',
      })
    } catch (err) {
      setToast({
        variant: 'danger',
        title: 'Erro ao marcar indisponibilidade',
        description: localizeApiError(err, 'Não foi possível marcar a indisponibilidade.'),
      })
    } finally {
      setUnavailabilitySaving(false)
    }
  }, [unavailabilitySaving])

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => { if (isMobile) setMobileOpen(false) }, [isMobile])

  const handleLogout = useCallback(async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }, [logout, navigate])

  const requestedStartTime = selectedCoachingReq?.preferredStartTime ?? selectedCoachingReq?.currentStartTime
  const requestedEndTime = selectedCoachingReq?.preferredEndTime ?? selectedCoachingReq?.currentEndTime
  const coachingDurationValue = Number(coachingDurationMin) || DEFAULT_COACHING_DURATION_MIN
  const coachingSuggestDurationValue = Number(coachingSuggestDurationMin) || DEFAULT_COACHING_DURATION_MIN
  const coachingEndPreview = selectedCoachingReq?.currentStartTime ? addMinutes(selectedCoachingReq.currentStartTime, coachingDurationValue) : null
  const coachingSuggestEndPreview = coachingSuggestStart ? addMinutes(coachingSuggestStart, coachingSuggestDurationValue) : null

  return (
    <div className="teacher-coaching-page">
      <div className={appShellCls}>
      {isMobile && mobileOpen ? (
        <button type="button" className="sidebar-overlay" aria-label="Fechar navegação lateral" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside className={sidebarCls} id="sidebar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <div>
            <h1>gestArtes</h1>
            <p>{displayName}</p>
          </div>
        </div>
        <div className="nav-group">
          <h2>Professor</h2>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={['nav-link', location.pathname === item.href ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}
          <button className="nav-link" type="button" onClick={handleLogout}>
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
                aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')}
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                onClick={handleSidebarToggle}
              >
                {toggleSymbol}
              </button>
              <h2>Pedidos de Coaching</h2>
            </div>
          </div>
        <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setUnavailabilityOpen(true)}>
                Marcar indisponibilidade
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { void loadCoachingRequests(); void loadGroupProposals(); }}>Recarregar</Button>
            </div>
            <NotificationsBell pageLink="/teacher/notifications" />
          </div>
        </header>

      <div className="page-content">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Pedidos de coaching individual</h3>
              <p className="panel-subtle">
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant="info" size="sm">{coachingReqs.length} pendente{coachingReqs.length !== 1 ? 's' : ''}</Badge>
              <Button variant="secondary" size="sm" onClick={loadCoachingRequests}>Recarregar</Button>
            </div>
          </div>
          {loadingCoaching ? (
            <div className="soft-box">A carregar pedidos...</div>
          ) : coachingReqs.length === 0 ? (
            <div className="soft-box">Sem pedidos de aula individual pendentes.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Aluno</th>
                    <th>Modalidade</th>
                    <th>Data / Hora</th>
                    <th>Notas</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {coachingReqs.map((req) => (
                    <tr key={req.requestId}>
                      <td>
                        <strong>#{req.requestId}</strong>
                        <br />
                        <small>{formatDateTime(req.requestedAt)}</small>
                      </td>
                      <td>
                        <strong>{[req.student?.firstName, req.student?.lastName].filter(Boolean).join(' ') || '—'}</strong>
                        {req.student?.email ? <><br /><small>{req.student.email}</small></> : null}
                      </td>
                      <td>{req.modalityName || '—'}</td>
                      <td>
                        <strong>{formatDate(req.currentStartTime)}</strong>
                        <br />
                        <small>
                          {req.currentStartTime ? new Date(req.currentStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {req.currentEndTime ? ` → ${new Date(req.currentEndTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ' (duração a definir)'}
                        </small>
                      </td>
                      <td><small>{req.requestNotes || '—'}</small></td>
                      <td>
                        <Button variant="secondary" size="sm" onClick={() => openCoachingReq(req)}>Rever</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Sessões de grupo</h3>
              <p className="panel-subtle">
                Agrupa 2 ou mais alunos numa sessão conjunta. Podes partir de pedidos pendentes ou criar do zero.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant="info" size="sm">{groupProposals.length} proposta{groupProposals.length !== 1 ? 's' : ''}</Badge>
              <Button variant="secondary" size="sm" onClick={() => openGroupModal('from-requests')} disabled={coachingReqs.length === 0}>
                Agrupar pedidos
              </Button>
              <Button variant="cta" size="sm" onClick={() => openGroupModal('scratch')}>
                Novo grupo
              </Button>
            </div>
          </div>
          {loadingGroups ? (
            <div className="soft-box">A carregar propostas...</div>
          ) : groupProposals.length === 0 ? (
            <div className="soft-box">Sem propostas de grupo. Usa os botões acima para criar uma.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {groupProposals.map((gp) => (
                <div key={gp.proposalId} className="group-pending-card">
                  <div className="group-pending-card-info">
                    <strong>
                      {gp.modalityName || '—'} · {gp.startTime ? new Date(gp.startTime).toLocaleDateString('pt-PT') : '—'}
                      {' · '}
                      <span style={{ color: '#0a7a70' }}>
                        {gp.participants.length === 2 ? 'Duo' : gp.participants.length === 3 ? 'Trio' : `Ensemble (${gp.participants.length})`}
                      </span>
                    </strong>
                    <small>
                      {gp.startTime ? new Date(gp.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {gp.endTime ? ` → ${new Date(gp.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      {' · '}{gp.participants.map((p) => [p.student?.firstName, p.student?.lastName].filter(Boolean).join(' ')).join(', ')}
                    </small>
                  </div>
                  <Badge variant={gp.status === 'APPROVED' ? 'success' : gp.status === 'REJECTED' ? 'danger' : 'warning'} size="sm">
                    {gp.status === 'APPROVED' ? 'Aprovada' : gp.status === 'REJECTED' ? 'Rejeitada' : 'Aguarda direção'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </article>

        </div>
      </main>

      {groupModalOpen ? (
        <Modal open onClose={closeGroupModal} title={groupModalMode === 'from-requests' ? 'Agrupar pedidos pendentes' : 'Nova sessão de grupo'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {groupModalMode === 'from-requests' && coachingReqs.length > 0 ? (
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Pedidos a incluir</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {coachingReqs.map((req) => {
                    const selected = groupSelectedRequestIds.includes(req.requestId)
                    return (
                      <label key={req.requestId} style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        border: `1.5px solid ${selected ? 'var(--studio-cta-start)' : 'var(--studio-field-line)'}`,
                        borderRadius: '0.85rem', background: selected ? 'linear-gradient(135deg, rgba(11,157,143,0.08),rgba(16,178,163,0.04))' : '#fff',
                        cursor: 'pointer',
                      }}>
                        <input type="checkbox" checked={selected} onChange={() => toggleRequestForGroup(req)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--studio-ink)', fontSize: '0.9rem' }}>
                            {[req.student?.firstName, req.student?.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--studio-muted)' }}>
                            {req.modalityName} · {req.currentStartTime ? new Date(req.currentStartTime).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                <label style={{ fontWeight: 600 }}>Alunos no grupo</label>
                {groupStudents.length >= 2 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px', background: 'rgba(11,157,143,0.12)', color: '#0a7a70' }}>
                    {groupStudents.length === 2 ? 'Duo' : groupStudents.length === 3 ? 'Trio' : `Ensemble · ${groupStudents.length}`}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: groupStudents.length >= 8 ? 'var(--text-danger, #dc2626)' : 'var(--text-h)', marginLeft: 'auto' }}>
                  {groupStudents.length}/8
                </span>
              </div>
              <div className="group-student-list">
                {groupStudents.map((s) => (
                  <span key={s.userId} className="group-student-chip">
                    {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email}
                    <button type="button" onClick={() => removeGroupStudent(s.userId)} title="Remover">×</button>
                  </span>
                ))}
                {groupStudents.length === 0 ? <span style={{ fontSize: '0.83rem', color: 'var(--studio-muted)' }}>Nenhum aluno adicionado ainda.</span> : null}
              </div>
              <div style={{ marginTop: '0.5rem', position: 'relative' }}>
                <input
                  type="search"
                  value={groupSearchQuery}
                  onChange={(e) => handleGroupStudentSearch(e.target.value)}
                  placeholder="Pesquisar aluno por nome ou email..."
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '0.85rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', fontSize: '0.9rem', color: 'var(--studio-ink)' }}
                />
                {(groupSearching || groupSearchResults.length > 0) ? (
                  <div className="group-search-results">
                    {groupSearching ? <div style={{ padding: '0.65rem 0.85rem', color: 'var(--studio-muted)', fontSize: '0.85rem' }}>A pesquisar...</div> : null}
                    {groupSearchResults.map((s) => {
                      const alreadyAdded = groupStudents.some((gs) => gs.userId === s.userId)
                      return (
                        <div
                          key={s.userId}
                          className={`group-search-result-item${alreadyAdded ? ' already-added' : ''}`}
                          onClick={() => !alreadyAdded && groupStudents.length < 8 && addGroupStudent(s)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--studio-muted)' }}>{s.email}</div>
                          </div>
                          {alreadyAdded
                            ? <span style={{ fontSize: '0.75rem', color: 'var(--studio-muted)' }}>Já adicionado</span>
                            : groupStudents.length >= 8
                              ? <span style={{ fontSize: '0.75rem', color: 'var(--studio-muted)' }}>Limite atingido</span>
                              : <span style={{ fontSize: '0.75rem', color: 'var(--studio-cta-start)' }}>Adicionar</span>
                          }
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.88rem' }}>Modalidade</label>
                <select
                  value={groupModalityId}
                  onChange={(e) => setGroupModalityId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', color: 'var(--studio-ink)' }}
                >
                  <option value="">Escolher...</option>
                  {modalities.map((m) => <option key={m.modalityId} value={m.modalityId}>{m.modalityName}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.88rem' }}>Início</label>
                <input type="datetime-local" value={groupStartTime} onChange={(e) => setGroupStartTime(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', color: 'var(--studio-ink)' }} />
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.88rem' }}>Fim</label>
                <input type="datetime-local" value={groupEndTime} min={groupStartTime || undefined} onChange={(e) => setGroupEndTime(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', color: 'var(--studio-ink)' }} />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.88rem' }}>Notas (opcional)</label>
              <textarea value={groupNotes} onChange={(e) => setGroupNotes(e.target.value)} rows={2} placeholder="Observações para a direção..." style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1px solid var(--studio-field-line)', background: '#fff', font: 'inherit', resize: 'vertical', color: 'var(--studio-ink)' }} />
            </div>

            {groupError ? <div className="modal-error" role="alert">{groupError}</div> : null}

            <div className="modal-footer-actions">
              <Button variant="secondary" onClick={closeGroupModal} disabled={groupSaving}>Cancelar</Button>
              <Button variant="cta" onClick={handleGroupSubmit} disabled={groupSaving || groupStudents.length < 2}>
                {groupSaving ? 'A criar...' : `Criar ${groupStudents.length === 2 ? 'duo' : groupStudents.length === 3 ? 'trio' : groupStudents.length >= 4 ? `ensemble (${groupStudents.length})` : 'grupo'}`}
              </Button>
            </div>
          </div>
        </Modal>
     ) : null}

      {selectedCoachingReq ? (
        <Modal
          open
          onClose={closeCoachingModal}
          title={`Pedido #${selectedCoachingReq.requestId} — ${[selectedCoachingReq.student?.firstName, selectedCoachingReq.student?.lastName].filter(Boolean).join(' ') || 'Aluno'}`}
          className="teacher-coaching-modal"
        >
          <div className="request-modal-content">
            <div className="request-meta-grid">
              <div className="request-meta-card">
                <strong>Modalidade</strong>
                <span>{selectedCoachingReq.modalityName || '—'}</span>
              </div>
              <div className="request-meta-card">
                <strong>Data pedida</strong>
                <span>{formatDate(requestedStartTime)}</span>
                <small>
                  {requestedStartTime
                    ? new Date(requestedStartTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                  {requestedEndTime
                    ? ` → ${new Date(requestedEndTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                    : ' (duração a definir)'}
                </small>
              </div>
              {selectedCoachingReq.requestNotes ? (
                <div className="request-meta-card" style={{ gridColumn: '1/-1' }}>
                  <strong>Notas do aluno</strong>
                  <span>{selectedCoachingReq.requestNotes}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Decisão</label>
              <div className="coaching-decision-toggle">
                <button type="button" className={coachingDecision === 'approve' ? 'active-approve' : ''} onClick={() => setCoachingDecision('approve')}>Aceitar</button>
                <button type="button" className={coachingDecision === 'suggest' ? 'active-suggest' : ''} onClick={() => setCoachingDecision('suggest')}>Sugerir horário</button>
                <button type="button" className={coachingDecision === 'reject' ? 'active-reject' : ''} onClick={() => setCoachingDecision('reject')}>Rejeitar</button>
              </div>
            </div>

            {coachingDecision === 'approve' && !selectedCoachingReq.currentEndTime ? (
              <div className="observations-field">
                <span>Duração da aula <span style={{ color: '#b91c1c' }}>(obrigatória)</span></span>
                <p className="coaching-modal-hint">
                  O aluno não definiu duração. Indica a duração antes de aprovar.
                </p>
                <div className="coaching-modal-field">
                  <label htmlFor="coaching-duration">Duração</label>
                  <select
                    id="coaching-duration"
                    className="coaching-modal-input"
                    value={coachingDurationMin}
                    onChange={(e) => setCoachingDurationMin(e.target.value)}
                  >
                    {COACHING_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration} min</option>
                    ))}
                  </select>
                </div>
                {coachingEndPreview ? (
                  <small className="coaching-duration-preview">
                    Termina as {formatTimeLabel(coachingEndPreview)}.
                  </small>
                ) : null}
              </div>
            ) : null}

            {coachingDecision === 'suggest' ? (
              <div className="observations-field">
                <span>Novo horário sugerido</span>
                <div className="coaching-modal-grid">
                  <div className="coaching-modal-field">
                    <label htmlFor="coaching-suggest-start">Início</label>
                    <input
                      id="coaching-suggest-start"
                      type="datetime-local"
                      className="coaching-modal-input"
                      value={coachingSuggestStart}
                      onChange={(e) => setCoachingSuggestStart(e.target.value)}
                    />
                  </div>
                  <div className="coaching-modal-field">
                    <label htmlFor="coaching-suggest-duration">Duração</label>
                    <select
                      id="coaching-suggest-duration"
                      className="coaching-modal-input"
                      value={coachingSuggestDurationMin}
                      onChange={(e) => setCoachingSuggestDurationMin(e.target.value)}
                    >
                      {COACHING_DURATIONS.map((duration) => (
                        <option key={duration} value={duration}>{duration} min</option>
                      ))}
                    </select>
                  </div>
                </div>
                {coachingSuggestEndPreview ? (
                  <small className="coaching-duration-preview">
                    Termina as {formatTimeLabel(coachingSuggestEndPreview)}.
                  </small>
                ) : null}
              </div>
            ) : null}

            <div className="observations-field">
              <span>Notas {coachingDecision === 'reject' ? <span style={{ color: '#b91c1c' }}>(obrigatórias)</span> : '(opcional)'}</span>
              <textarea
                value={coachingNotes}
                onChange={(e) => setCoachingNotes(e.target.value)}
                placeholder={coachingDecision === 'reject' ? 'Indica o motivo da rejeição...' : 'Observações para o aluno...'}
              />
            </div>

            {coachingReviewError ? <div className="modal-error" role="alert">{coachingReviewError}</div> : null}

            <div className="modal-footer-actions">
              <Button variant="secondary" onClick={closeCoachingModal} disabled={coachingSaving}>Cancelar</Button>
              <Button
                variant={coachingDecision === 'reject' ? 'danger' : 'cta'}
                onClick={handleCoachingReviewSubmit}
                disabled={coachingSaving}
              >
                {coachingSaving ? 'A guardar...' : coachingDecision === 'approve' ? 'Aceitar pedido' : coachingDecision === 'suggest' ? 'Enviar sugestão' : 'Rejeitar pedido'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      <UnavailabilityModal
        isOpen={unavailabilityOpen}
        onClose={() => {
          if (!unavailabilitySaving) setUnavailabilityOpen(false)
        }}
        onSubmit={handleUnavailabilitySubmit}
      />

      {toast ? (
        <Toast
          open
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => setToast(null)}
          style={{ position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 60, background: '#ffffff', color: '#1f1c2e' }}
        />
      ) : null}
      </div>
    </div>
  )
}
