/**
 * @file src/pages/teacher/AdmissionRequestsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import Toast from '../../components/ui/Toast'
import './AdmissionRequestsPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Pedidos de admissão', href: '/teacher/admission-requests' },
  { label: 'Inventário da Escola', href: '/teacher/inventory' },
]

function toInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed)
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function formatTime(value) {
  if (!value) {
    return '—'
  }

  return String(value).slice(0, 5)
}

function getDeadlineLabel(value) {
  if (!value) {
    return '48h a contar da submissão'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '48h a contar da submissão'
  }

  const deadline = new Date(parsed.getTime() + 48 * 60 * 60 * 1000)
  return `Até ${formatDateTime(deadline)}`
}

function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function resolveStatusVariant(statusName) {
  const normalized = String(statusName || '').trim().toLowerCase()

  if (normalized.includes('reject') || normalized.includes('rejeit')) {
    return 'danger'
  }

  if (normalized.includes('approve') || normalized.includes('aguard') || normalized.includes('pending')) {
    return 'warning'
  }

  return 'neutral'
}

function resolveStatusLabel(statusName) {
  const normalized = String(statusName || '').trim().toLowerCase()

  if (!normalized) {
    return 'Pendente'
  }

  if (normalized.includes('reject') || normalized.includes('rejeit')) {
    return 'Rejeitado'
  }

  if (normalized.includes('approve') && normalized.includes('teacher')) {
    return 'Aguardando gestão'
  }

  if (normalized.includes('approve')) {
    return 'Aprovado'
  }

  if (normalized.includes('pend')) {
    return 'Pendente'
  }

  return statusName
}

function getCapacityState(request) {
  if (request.maxParticipants == null || request.maxParticipants <= 0) {
    return {
      badge: 'neutral',
      label: 'Capacidade flexível',
      detail: `${request.enrolledCount} estudantes inscritos`,
    }
  }

  const remainingSeats = request.maxParticipants - request.enrolledCount

  if (remainingSeats <= 0) {
    return {
      badge: 'danger',
      label: 'Lotado',
      detail: `${request.enrolledCount}/${request.maxParticipants}`,
    }
  }

  if (remainingSeats === 1) {
    return {
      badge: 'warning',
      label: 'Última vaga',
      detail: `${request.enrolledCount}/${request.maxParticipants}`,
    }
  }

  return {
    badge: 'info',
    label: `${remainingSeats} vagas livres`,
    detail: `${request.enrolledCount}/${request.maxParticipants}`,
  }
}

function normalizeRequest(item) {
  const joinRequestId = toInteger(item?.joinRequestId ?? item?.JoinRequestID ?? item?.id)
  const sessionId = toInteger(item?.sessionId ?? item?.SessionID)
  const studentName = String(
    item?.studentName
      ?? [item?.studentFirstName, item?.studentLastName].filter(Boolean).join(' ')
      ?? 'Estudante',
  ).trim() || 'Estudante'
  const studentEmail = String(item?.studentEmail ?? item?.email ?? '').trim()
  const requestedAt = item?.requestedAt ?? item?.RequestedAt ?? null
  const sessionDate = item?.sessionDate ?? item?.sessionStartDate ?? item?.startDate ?? null
  const sessionStartTime = item?.sessionStartTime ?? item?.startTime ?? item?.sessionTime ?? null
  const sessionEndTime = item?.sessionEndTime ?? item?.endTime ?? null
  const maxParticipants = item?.maxParticipants == null || item?.maxParticipants === ''
    ? null
    : toInteger(item?.maxParticipants, null)
  const enrolledCount = toInteger(item?.enrolledCount ?? item?.studentCount ?? 0)
  const observations = String(item?.observations ?? item?.reviewNotes ?? item?.notes ?? '').trim()

  return {
    joinRequestId,
    requestCode: item?.requestCode || `JR-${String(joinRequestId).padStart(4, '0')}`,
    sessionId,
    sessionCode: item?.sessionCode || `#${sessionId}`,
    studentName,
    studentEmail,
    studentGuardian: String(item?.guardianName ?? item?.guardian ?? '').trim(),
    sessionLabel: String(item?.sessionLabel ?? item?.sessionName ?? `Sessão #${sessionId}`).trim(),
    sessionDate,
    sessionStartTime,
    sessionEndTime,
    studioName: String(item?.studioName ?? item?.studio ?? '—').trim() || '—',
    modalityName: String(item?.modalityName ?? item?.modality ?? '—').trim() || '—',
    statusName: String(item?.statusName ?? item?.status ?? 'Pendente').trim() || 'Pendente',
    requestedAt,
    deadlineAt: requestedAt ? new Date(new Date(requestedAt).getTime() + 48 * 60 * 60 * 1000).toISOString() : null,
    maxParticipants,
    enrolledCount,
    observations,
  }
}

function normalizeRequestsPayload(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.requests)
      ? payload.requests
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return items
    .map(normalizeRequest)
    .sort((left, right) => {
      const leftTime = new Date(left.requestedAt || 0).getTime()
      const rightTime = new Date(right.requestedAt || 0).getTime()

      if (leftTime !== rightTime) {
        return leftTime - rightTime
      }

      return left.joinRequestId - right.joinRequestId
    })
}

function normalizeSummary(payload) {
  return {
    admissionRequests: toInteger(payload?.admissionRequests ?? payload?.pendingRequests, 0),
    classesToday: toInteger(payload?.classesToday, 0),
    pendingConfirmations: toInteger(payload?.pendingConfirmations, 0),
    noShows: toInteger(payload?.noShows, 0),
  }
}

function buildSearchIndex(request) {
  return [
    request.requestCode,
    request.studentName,
    request.studentEmail,
    request.sessionLabel,
    request.modalityName,
    request.studioName,
    request.statusName,
    request.sessionCode,
  ]
    .join(' ')
    .toLowerCase()
}

export default function AdmissionRequestsPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [summary, setSummary] = useState(null)
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
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  const notificationBoxRef = useRef(null)

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [summaryResult, requestsResult] = await Promise.allSettled([
      api.get('/teacher/dashboard'),
      api.get('/teacher/admission-requests'),
    ])

    if (summaryResult.status === 'fulfilled') {
      setSummary(normalizeSummary(summaryResult.value.data))
    } else {
      setSummary(null)
    }

    if (requestsResult.status === 'fulfilled') {
      setRequests(normalizeRequestsPayload(requestsResult.value.data))
    } else {
      setRequests([])
      setError(requestsResult.reason?.response?.data?.error || 'Não foi possível carregar os pedidos de admissão.')
    }

    setLoading(false)
  }, [])

  const refreshNotificationSummary = useCallback(async () => {
    const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
    setNotificationUnreadCount(preview.unreadCount)
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

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void refreshNotificationSummary()
  }, [refreshNotificationSummary])

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notificationsOpen])

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return requests
    }

    return requests.filter((request) => buildSearchIndex(request).includes(term))
  }, [requests, searchTerm])

  const criticalRequests = useMemo(() => {
    return filteredRequests.filter((request) => {
      if (request.maxParticipants == null || request.maxParticipants <= 0) {
        return false
      }

      return request.maxParticipants - request.enrolledCount <= 1
    })
  }, [filteredRequests])
  
  const selectedCapacityState = useMemo(
    () => (selectedRequest ? getCapacityState(selectedRequest) : null),
    [selectedRequest],
  )

  const isSelectedSessionFull = useMemo(() => {
    if (!selectedRequest) {
      return false
    }

    if (selectedRequest.maxParticipants == null || selectedRequest.maxParticipants <= 0) {
      return false
    }

    return selectedRequest.enrolledCount >= selectedRequest.maxParticipants
  }, [selectedRequest])

  const openRequest = useCallback((request) => {
    setSelectedRequest(request)
    setDecision(request.maxParticipants != null && request.maxParticipants - request.enrolledCount <= 0 ? 'reject' : 'approve')
    setObservations('')
    setReviewError('')
  }, [])

  const closeModal = useCallback(() => {
    if (saving) {
      return
    }

    setSelectedRequest(null)
    setObservations('')
    setReviewError('')
  }, [saving])

  const handleReviewSubmit = useCallback(async () => {
    if (!selectedRequest || saving) {
      return
    }

    const normalizedObservations = observations.trim()

    if (decision === 'reject' && !normalizedObservations) {
      setReviewError('As observações são obrigatórias quando rejeitas o pedido.')
      return
    }

    setSaving(true)
    setReviewError('')

    try {
      const response = await api.patch(`/teacher/admission-requests/${selectedRequest.joinRequestId}/review`, {
        decision,
        observations: normalizedObservations,
      })

      const reviewedId = toInteger(response.data?.request?.joinRequestId ?? selectedRequest.joinRequestId)

      setRequests((currentRequests) => currentRequests.filter((request) => request.joinRequestId !== reviewedId))
      setSummary((currentSummary) => ({
        ...currentSummary,
        admissionRequests: Math.max(0, (currentSummary.admissionRequests ?? 0) - 1),
      }))
      setSelectedRequest(null)
      setObservations('')
      setToast({
        title: decision === 'approve' ? 'Pedido aprovado' : 'Pedido rejeitado',
        description:
          decision === 'approve'
            ? 'O estudante foi notificado e o pedido segue para validação final.'
            : 'O estudante foi notificado com a tua observação.',
        variant: 'success',
      })
      await refreshNotificationSummary()
    } catch (requestError) {
      setReviewError(requestError?.response?.data?.error || 'Não foi possível guardar a decisão.')
    } finally {
      setSaving(false)
    }
  }, [decision, observations, refreshNotificationSummary, selectedRequest, saving])

  const handleNotificationsClick = useCallback(() => {
    const nextState = !notificationsOpen
    setNotificationsOpen(nextState)

    if (nextState && !notificationsLoaded) {
      void loadNotificationPreview()
    }
  }, [loadNotificationPreview, notificationsLoaded, notificationsOpen])

  const tableColumns = useMemo(() => ([
    {
      key: 'requestCode',
      header: 'Pedido',
      render: (request) => (
        <button
          type="button"
          className="request-link"
          onClick={() => openRequest(request)}
        >
          <strong>{request.requestCode}</strong>
          <span>{formatDateTime(request.requestedAt)}</span>
        </button>
      ),
    },
    {
      key: 'studentName',
      header: 'Estudante',
      render: (request) => (
        <div className="request-student">
          <strong>{request.studentName}</strong>
          <span>{request.studentEmail || 'Sem email indicado'}</span>
        </div>
      ),
    },
    {
      key: 'sessionLabel',
      header: 'Sessão',
      render: (request) => (
        <div className="request-session">
          <strong>{request.sessionLabel}</strong>
          <span>
            {request.modalityName} · {request.studioName}
          </span>
          <small>
            {formatDate(request.sessionDate)} · {formatTime(request.sessionStartTime)}
            {request.sessionEndTime ? `–${formatTime(request.sessionEndTime)}` : ''}
          </small>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Lotação',
      render: (request) => {
        const capacityState = getCapacityState(request)

        return (
          <div className="request-capacity">
            <Badge variant={capacityState.badge} size="sm">{capacityState.label}</Badge>
            <span>{capacityState.detail}</span>
          </div>
        )
      },
    },
    {
      key: 'statusName',
      header: 'Estado',
      render: (request) => (
        <Badge variant={resolveStatusVariant(request.statusName)} size="sm">
          {resolveStatusLabel(request.statusName)}
        </Badge>
      ),
    },
    {
      key: 'deadlineAt',
      header: 'Prazo',
      render: (request) => <span className="request-deadline">{getDeadlineLabel(request.requestedAt)}</span>,
    },
  ]), [openRequest])

  return (
    <div className="teacher-admission-requests">
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
                <h2>Pedidos de adesão</h2>
              </div>
              <p>Validação de pedidos de adesão a sessões privadas</p>
            </div>

            <div className="topbar-right" ref={notificationBoxRef}>
              <input
                className="search"
                type="search"
                placeholder="Pesquisar estudante, sessão ou estúdio"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Link className="pill" to="/teacher/dashboard">
                Painel docente
              </Link>
              <button type="button" className="pill notifications-pill" onClick={handleNotificationsClick}>
                Notificações {notificationUnreadCount}
              </button>

              {notificationsOpen ? (
                <div className="notifications-popover">
                  <div className="notifications-popover-header">
                    <strong>Notificações</strong>
                  </div>

                  {notificationsLoading ? <p className="notifications-state">A carregar...</p> : null}

                  {!notificationsLoading && notificationsError ? (
                    <p className="notifications-state error">{notificationsError}</p>
                  ) : null}

                  {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                    <p className="notifications-state">Sem notificações.</p>
                  ) : null}

                  {!notificationsLoading && notifications.length > 0 ? (
                    <ul className="notifications-list">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="notifications-item">
                          <strong>{notification.title}</strong>
                          {notification.message ? <p>{notification.message}</p> : null}
                          <small>{formatNotificationDate(notification.createdAt)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <Link
                    to="/notifications"
                    className="notifications-more-link"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Ver Mais
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <section className="content-grid">
            {error ? (
              <div className="error-banner">
                {error}
                <button className="pill" style={{ marginLeft: '0.65rem' }} type="button" onClick={loadData}>
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className="kpi-grid">
              <article className="kpi">
                <h3>Pedidos pendentes</h3>
                <strong>{summary?.admissionRequests || requests.length}</strong>
              </article>
              <article className="kpi">
                <h3>Aulas hoje</h3>
                <strong>{summary?.classesToday ?? 0}</strong>
              </article>
              <article className="kpi">
                <h3>Confirmações pendentes</h3>
                <strong>{summary?.pendingConfirmations ?? 0}</strong>
              </article>
              <article className="kpi">
                <h3>Pedidos críticos</h3>
                <strong>{criticalRequests.length}</strong>
              </article>
            </div>

            <div className="split">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Fila de pedidos</h3>
                    <p className="panel-subtle">
                      Clique num pedido para rever os detalhes, escrever observações e notificar o estudante.
                    </p>
                  </div>
                  <Badge variant="info" size="sm">{filteredRequests.length} visíveis</Badge>
                </div>

                {loading ? (
                  <div className="loading-stack" aria-label="A carregar pedidos de admissão">
                    <LoadingSkeleton variant="text" lines={1} width="42%" />
                    <LoadingSkeleton variant="block" height="3rem" />
                    <LoadingSkeleton variant="block" height="12rem" />
                  </div>
                ) : (
                  <Table
                    columns={tableColumns}
                    rows={filteredRequests}
                    getRowKey={(request) => request.joinRequestId}
                    emptyState="Sem pedidos pendentes para validar."
                    compact
                    striped
                    headBackground="rgba(11, 157, 143, 0.08)"
                    style={{ background: 'transparent', border: 0, boxShadow: 'none' }}
                    renderRowActions={(request) => (
                      <Button variant="secondary" size="sm" onClick={() => openRequest(request)}>
                        Rever
                      </Button>
                    )}
                  />
                )}
              </article>

              <article className="panel">
                <h3>Fluxo de validação</h3>
                <p className="panel-subtle">
                  O professor(a) valida primeiro. Se aprovares, o pedido segue para validação final da Direção.
                </p>

                <ul className="list helper-list">
                  <li>Verifica a lotação da sessão e a compatibilidade pedagógica.</li>
                  <li>Escreve observações claras para o estudante.</li>
                  <li>A notificação é enviada ao estudante assim que guardas a decisão.</li>
                </ul>

                <div className="quick-actions">
                  <Link className="cta" to="/teacher/dashboard">
                    Voltar ao painel
                  </Link>
                  <Button variant="ctaSecondary" onClick={loadData}>
                    Recarregar fila
                  </Button>
                </div>

                <div className="soft-box review-note">
                  <strong>Prazo de resposta</strong>
                  <p>
                    Cada pedido deve ser tratado em 48 horas. Quando o pedido fica perto do limite, assinalamos a fila como crítica.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>

      <Modal
        open={Boolean(selectedRequest)}
        title={selectedRequest ? `Rever ${selectedRequest.requestCode}` : undefined}
        size="lg"
        className="teacher-admission-modal"
        onClose={closeModal}
        footer={selectedRequest ? (
          <div className="modal-footer-actions">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant={decision === 'reject' ? 'danger' : 'cta'}
              onClick={() => void handleReviewSubmit()}
              disabled={saving || (decision === 'approve' && isSelectedSessionFull)}
            >
              {saving
                ? 'A guardar...'
                : decision === 'approve'
                  ? 'Aprovar e notificar'
                  : 'Rejeitar e notificar'}
            </Button>
          </div>
        ) : null}
      >
        {selectedRequest ? (
          <div className="request-modal-content">
            <div className="request-meta-grid">
              <div className="request-meta-card">
                <strong>Estudante</strong>
                <span>{selectedRequest.studentName}</span>
                <small>{selectedRequest.studentEmail || 'Sem email indicado'}</small>
              </div>

              <div className="request-meta-card">
                <strong>Sessão</strong>
                <span>{selectedRequest.sessionLabel}</span>
                <small>
                  {selectedRequest.modalityName} · {selectedRequest.studioName}
                </small>
              </div>

              <div className="request-meta-card">
                <strong>Lotação</strong>
                <span>{selectedCapacityState?.label}</span>
                <small>{selectedCapacityState?.detail}</small>
              </div>

              <div className="request-meta-card">
                <strong>Pedido</strong>
                <span>{formatDateTime(selectedRequest.requestedAt)}</span>
                <small>{getDeadlineLabel(selectedRequest.requestedAt)}</small>
              </div>
            </div>

            {isSelectedSessionFull ? (
              <p className="modal-warning">
                Esta sessão está lotada. Só é possível rejeitar o pedido neste momento.
              </p>
            ) : null}

            <div className="decision-toggle" role="group" aria-label="Decisão do pedido">
              <button
                type="button"
                className={decision === 'approve' ? 'active approve' : ''}
                disabled={isSelectedSessionFull}
                onClick={() => setDecision('approve')}
              >
                Aprovar
              </button>
              <button
                type="button"
                className={decision === 'reject' ? 'active reject' : ''}
                onClick={() => setDecision('reject')}
              >
                Rejeitar
              </button>
            </div>

            <label className="observations-field">
              <span>Observações</span>
              <textarea
                rows={5}
                placeholder="Escreve aqui a observação que será usada na notificação do estudante"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
              />
              <div className="observations-meta">
                <small>{observations.trim().length}/255</small>
              </div>
            </label>

            {reviewError ? <p className="modal-error">{reviewError}</p> : null}

            <Badge variant={resolveStatusVariant(selectedRequest.statusName)} size="sm" className="request-status-badge">
              {resolveStatusLabel(selectedRequest.statusName)}
            </Badge>
          </div>
        ) : null}
      </Modal>

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
  )
}