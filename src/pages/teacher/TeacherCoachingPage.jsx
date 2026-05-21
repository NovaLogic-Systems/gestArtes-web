/**
 * @file src/pages/teacher/TeacherCoachingPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import '../admin-studios.css'
import './TeacherCoachingPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import { localizeApiError } from '../../utils/apiErrors'

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

function resolveStatusVariant(statusName) {
  const n = String(statusName || '').trim().toLowerCase()
  if (n.includes('reject') || n.includes('rejeit')) return 'danger'
  if (n.includes('approve') || n.includes('aguard') || n.includes('pend')) return 'warning'
  return 'neutral'
}

function resolveStatusLabel(statusName) {
  const n = String(statusName || '').trim().toLowerCase()
  if (!n) return 'Pendente'
  if (n.includes('reject') || n.includes('rejeit')) return 'Rejeitado'
  if (n.includes('approve') && n.includes('teacher')) return 'Aguarda gestão'
  if (n.includes('approve')) return 'Aprovado'
  if (n.includes('pend')) return 'Pendente'
  return 'Estado desconhecido'
}

function getCapacityState(request) {
  if (request.maxParticipants == null || request.maxParticipants <= 0) {
    return { badge: 'neutral', label: 'Capacidade flexível', detail: `${request.enrolledCount} inscritos` }
  }
  const remaining = request.maxParticipants - request.enrolledCount
  if (remaining <= 0) return { badge: 'danger', label: 'Lotado', detail: `${request.enrolledCount}/${request.maxParticipants}` }
  if (remaining === 1) return { badge: 'warning', label: 'Última vaga', detail: `${request.enrolledCount}/${request.maxParticipants}` }
  return { badge: 'info', label: `${remaining} vagas`, detail: `${request.enrolledCount}/${request.maxParticipants}` }
}

function normalizeRequest(item) {
  const joinRequestId = toInteger(item?.joinRequestId ?? item?.JoinRequestID)
  const sessionId = toInteger(item?.sessionId ?? item?.SessionID)
  const studentName = String(
    item?.studentName ?? [item?.studentFirstName, item?.studentLastName].filter(Boolean).join(' ') ?? 'Estudante',
  ).trim() || 'Estudante'
  return {
    joinRequestId,
    requestCode: item?.requestCode || `JR-${String(joinRequestId).padStart(4, '0')}`,
    sessionId,
    studentName,
    studentEmail: String(item?.studentEmail ?? '').trim(),
    studentGuardian: String(item?.guardianName ?? '').trim(),
    sessionLabel: String(item?.sessionLabel ?? `Sessão #${sessionId}`).trim(),
    sessionDate: item?.sessionDate ?? null,
    sessionStartTime: item?.sessionStartTime ?? null,
    sessionEndTime: item?.sessionEndTime ?? null,
    studioName: String(item?.studioName ?? '—').trim() || '—',
    modalityName: String(item?.modalityName ?? '—').trim() || '—',
    statusName: String(item?.statusName ?? 'Pendente').trim() || 'Pendente',
    requestedAt: item?.requestedAt ?? null,
    maxParticipants: item?.maxParticipants == null || item?.maxParticipants === '' ? null : toInteger(item?.maxParticipants, null),
    enrolledCount: toInteger(item?.enrolledCount ?? 0),
  }
}

function normalizeRequestsPayload(payload) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.requests) ? payload.requests : []
  return items.map(normalizeRequest).sort((a, b) => {
    const at = new Date(a.requestedAt || 0).getTime()
    const bt = new Date(b.requestedAt || 0).getTime()
    return at !== bt ? at - bt : a.joinRequestId - b.joinRequestId
  })
}

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export default function TeacherCoachingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [decision, setDecision] = useState('approve')
  const [observations, setObservations] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/teacher/admission-requests')
      setRequests(normalizeRequestsPayload(response.data))
    } catch {
      setError('Não foi possível carregar os pedidos de coaching.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredRequests = useMemo(() => {
    const term = normalizeText(searchTerm)
    if (!term) return requests
    return requests.filter((r) =>
      normalizeText([r.requestCode, r.studentName, r.studentEmail, r.sessionLabel, r.modalityName, r.studioName, r.statusName].join(' ')).includes(term),
    )
  }, [requests, searchTerm])

  const openRequest = useCallback((request) => {
    setSelectedRequest(request)
    const cap = request.maxParticipants != null && request.maxParticipants > 0
      ? request.maxParticipants - request.enrolledCount
      : 1
    setDecision(cap <= 0 ? 'reject' : 'approve')
    setObservations('')
    setReviewError('')
  }, [])

  const closeModal = useCallback(() => {
    if (saving) return
    setSelectedRequest(null)
    setObservations('')
    setReviewError('')
  }, [saving])

  const handleReviewSubmit = useCallback(async () => {
    if (!selectedRequest || saving) return
    const trimmed = observations.trim()
    if (decision === 'reject' && !trimmed) {
      setReviewError('As observações são obrigatórias quando rejeitas o pedido.')
      return
    }
    setSaving(true)
    setReviewError('')
    try {
      await api.patch(`/teacher/admission-requests/${selectedRequest.joinRequestId}/review`, {
        decision,
        observations: trimmed,
      })
      setRequests((prev) => prev.filter((r) => r.joinRequestId !== selectedRequest.joinRequestId))
      setSelectedRequest(null)
      setObservations('')
      setToast({
        title: decision === 'approve' ? 'Pedido aprovado' : 'Pedido rejeitado',
        description: decision === 'approve'
          ? 'O estudante foi notificado e o pedido segue para validação final.'
          : 'O estudante foi notificado com a tua observação.',
        variant: 'success',
      })
    } catch (err) {
      setReviewError(localizeApiError(err, 'Não foi possível guardar a decisão.'))
    } finally {
      setSaving(false)
    }
  }, [decision, observations, selectedRequest, saving])

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => { if (isMobile) setMobileOpen(false) }, [isMobile])

  const handleLogout = useCallback(async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }, [logout, navigate])

  const selectedCapState = useMemo(() => selectedRequest ? getCapacityState(selectedRequest) : null, [selectedRequest])

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
            <input
              type="search"
              className="topbar-search"
              placeholder="Pesquisar estudante, sessão ou estúdio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <NotificationsBell pageLink="/teacher/notifications" />
          </div>
        </header>

        <div className="page-content">
          {error ? (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={loadData} className="retry-btn">Tentar novamente</button>
            </div>
          ) : null}

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Pedidos de adesão pendentes</h3>
                <p className="panel-subtle">
                  Estudantes que pediram para ingressar nas tuas sessões de coaching. Clica num pedido para rever e decidir.
                </p>
              </div>
              <Badge variant="info" size="sm">{filteredRequests.length} visíveis</Badge>
            </div>
            {loading ? (
              <div className="soft-box">A carregar pedidos...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="soft-box">
                {searchTerm ? 'Nenhum pedido encontrado.' : 'Sem pedidos de coaching pendentes.'}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Estudante</th>
                      <th>Sessão</th>
                      <th>Lotação</th>
                      <th>Estado</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const cap = getCapacityState(request)
                      return (
                        <tr key={request.joinRequestId}>
                          <td>
                            <strong>{request.requestCode}</strong>
                            <br />
                            <small>{formatDateTime(request.requestedAt)}</small>
                          </td>
                          <td>
                            <strong>{request.studentName}</strong>
                            {request.studentEmail ? <><br /><small>{request.studentEmail}</small></> : null}
                          </td>
                          <td>
                            <strong>{request.sessionLabel}</strong>
                            <br />
                            <small>{request.modalityName} · {request.studioName}</small>
                            <br />
                            <small>{formatDate(request.sessionDate)} · {formatTime(request.sessionStartTime)}{request.sessionEndTime ? `–${formatTime(request.sessionEndTime)}` : ''}</small>
                          </td>
                          <td>
                            <Badge variant={cap.badge} size="sm">{cap.label}</Badge>
                            <br />
                            <small>{cap.detail}</small>
                          </td>
                          <td>
                            <Badge variant={resolveStatusVariant(request.statusName)} size="sm">
                              {resolveStatusLabel(request.statusName)}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="secondary" size="sm" onClick={() => openRequest(request)}>
                              Rever
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="panel">
            <h3>Fluxo de aprovação</h3>
            <p className="panel-subtle">
              Como professor(a), és o primeiro a validar os pedidos de adesão. Se aprovedores, o pedido segue para validação final da Direção.
            </p>
            <ul className="list helper-list">
              <li>Verifica a lotação da sessão e a compatibilidade pedagógica.</li>
              <li>Escreve observações claras para o estudante (obrigatórias ao rejeitar).</li>
              <li>A notificação é enviada ao estudante assim que guardas a decisão.</li>
            </ul>
            <div className="quick-actions" style={{ marginTop: '0.75rem' }}>
              <Button variant="cta" onClick={loadData}>Recarregar pedidos</Button>
            </div>
          </article>
        </div>
      </main>

      {selectedRequest ? (
        <Modal open onClose={closeModal} title={`Rever ${selectedRequest.requestCode}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="soft-box">
              <p><strong>Estudante:</strong> {selectedRequest.studentName}</p>
              <p><strong>Email:</strong> {selectedRequest.studentEmail || '—'}</p>
              {selectedRequest.studentGuardian ? <p><strong>Encarregado:</strong> {selectedRequest.studentGuardian}</p> : null}
              <p><strong>Sessão:</strong> {selectedRequest.sessionLabel} — {selectedRequest.modalityName} · {selectedRequest.studioName}</p>
              <p><strong>Data:</strong> {formatDate(selectedRequest.sessionDate)} · {formatTime(selectedRequest.sessionStartTime)}{selectedRequest.sessionEndTime ? `–${formatTime(selectedRequest.sessionEndTime)}` : ''}</p>
              {selectedCapState ? (
                <p>
                  <strong>Lotação:</strong>{' '}
                  <Badge variant={selectedCapState.badge} size="sm">{selectedCapState.label}</Badge>{' '}
                  {selectedCapState.detail}
                </p>
              ) : null}
            </div>

            <div>
              <label style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Decisão</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant={decision === 'approve' ? 'cta' : 'secondary'} size="sm" onClick={() => setDecision('approve')}>
                  Aprovar
                </Button>
                <Button variant={decision === 'reject' ? 'danger' : 'secondary'} size="sm" onClick={() => setDecision('reject')}>
                  Rejeitar
                </Button>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'block' }} htmlFor="coaching-observations">
                Observações {decision === 'reject' ? <span style={{ color: '#b91c1c' }}>(obrigatórias)</span> : '(opcional)'}
              </label>
              <textarea
                id="coaching-observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                placeholder={decision === 'reject' ? 'Indica o motivo da rejeição...' : 'Observações para o estudante...'}
              />
            </div>

            {reviewError ? <div className="error-banner" role="alert">{reviewError}</div> : null}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancelar</Button>
              <Button variant={decision === 'approve' ? 'cta' : 'danger'} onClick={handleReviewSubmit} disabled={saving}>
                {saving ? 'A guardar...' : decision === 'approve' ? 'Aprovar pedido' : 'Rejeitar pedido'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

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
