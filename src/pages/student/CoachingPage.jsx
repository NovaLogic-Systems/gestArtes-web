/**
 * @file src/pages/student/CoachingPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import {
  createCoachingRequest,
  getAvailableSlots,
  getCoachingRequestById,
  listCoachingModalities,
  listCoachingTeachersByModality,
  listMyCoachingRequests,
  respondToTeacherSuggestion,
} from '../../services/coaching'
import { resolveMarketplacePhotoUrl } from '../../utils/marketplace-photo-url'
import { localizeApiError } from '../../utils/apiErrors'
import './coaching.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toPositiveInt(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getWeekMondayISO(offsetWeeks = 0) {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - day + 1 + offsetWeeks * 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function buildWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 6; i += 1) {
    const date = new Date(`${weekStart}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + i)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function formatDateLabel(dateValue) {
  if (!dateValue) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${dateValue}T00:00:00.000Z`))
}

function formatDateTimeLabel(dateValue) {
  if (!dateValue) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function formatTimeLabel(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function parseTimeToMinutes(value) {
  const [hours, mins] = String(value || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null
  return (hours * 60) + mins
}

function studentFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Aluno'
}

function requestStatusMeta(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING_TEACHER_REVIEW':
      return { label: 'Aguarda professor', variant: 'warning' }
    case 'PENDING_STUDENT_CONFIRMATION':
      return { label: 'A tua resposta', variant: 'warning' }
    case 'PENDING_ADMIN_APPROVAL':
      return { label: 'Aguarda direção', variant: 'info' }
    case 'APPROVED':
      return { label: 'Aprovado', variant: 'success' }
    case 'REJECTED':
      return { label: 'Rejeitado', variant: 'danger' }
    case 'CANCELLED':
      return { label: 'Cancelado', variant: 'danger' }
    default:
      return { label: 'Estado', variant: 'neutral' }
  }
}

function actionLabel(actionType) {
  switch (String(actionType || '').toUpperCase()) {
    case 'CREATED':
      return 'Pedido criado'
    case 'TEACHER_APPROVED':
      return 'Professor aprovou'
    case 'TEACHER_SUGGESTED_TIME':
      return 'Professor sugeriu novo horário'
    case 'TEACHER_REJECTED':
      return 'Professor rejeitou'
    case 'STUDENT_ACCEPTED_SUGGESTION':
      return 'Aluno aceitou a sugestão'
    case 'STUDENT_REJECTED_SUGGESTION':
      return 'Aluno rejeitou a sugestão'
    case 'ADMIN_APPROVED':
      return 'Direção aprovou'
    case 'ADMIN_REJECTED':
      return 'Direção rejeitou'
    default:
      return String(actionType || 'Ação')
  }
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'PR'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function buildTeacherAvailabilityMap(windows = [], teacherId) {
  const byDate = new Map()

  for (const windowRecord of windows) {
    if (Number(windowRecord.teacherId) !== Number(teacherId)) continue

    if (!byDate.has(windowRecord.date)) {
      byDate.set(windowRecord.date, [])
    }

    byDate.get(windowRecord.date).push(windowRecord)
  }

  return byDate
}

function buildTimeRows(dayWindowsMap) {
  const minutes = []

  for (const windows of dayWindowsMap.values()) {
    for (const windowRecord of windows) {
      const start = parseTimeToMinutes(windowRecord.windowStart)
      const end = parseTimeToMinutes(windowRecord.windowEnd)
      if (start != null) minutes.push(start)
      if (end != null) minutes.push(end)

      for (const session of windowRecord.bookedSessions || []) {
        const sessionStart = new Date(session.startTime).toISOString().slice(11, 16)
        const sessionEnd = new Date(session.endTime).toISOString().slice(11, 16)
        const startMinutes = parseTimeToMinutes(sessionStart)
        const endMinutes = parseTimeToMinutes(sessionEnd)
        if (startMinutes != null) minutes.push(startMinutes)
        if (endMinutes != null) minutes.push(endMinutes)
      }
    }
  }

  const min = minutes.length ? Math.floor(Math.min(...minutes) / 30) * 30 : 18 * 60
  const max = minutes.length ? Math.ceil(Math.max(...minutes) / 30) * 30 : (21 * 60) + 30
  const rows = []

  for (let minute = min; minute < max; minute += 30) {
    rows.push(minute)
  }

  return rows
}

function getCellState(windowRecords, date, startMinutes, endMinutes) {
  const slots = windowRecords || []
  const booked = slots.some((windowRecord) => {
    return (windowRecord.bookedSessions || []).some((session) => {
      const sessionStart = parseTimeToMinutes(new Date(session.startTime).toISOString().slice(11, 16))
      const sessionEnd = parseTimeToMinutes(new Date(session.endTime).toISOString().slice(11, 16))
      return sessionStart != null && sessionEnd != null && sessionStart < endMinutes && sessionEnd > startMinutes
    })
  })

  if (booked) {
    return { state: 'booked' }
  }

  const available = slots.some((windowRecord) => {
    const windowStart = parseTimeToMinutes(windowRecord.windowStart)
    const windowEnd = parseTimeToMinutes(windowRecord.windowEnd)
    return windowStart != null && windowEnd != null && startMinutes >= windowStart && endMinutes <= windowEnd
  })

  if (!available) {
    return { state: 'empty' }
  }

  const slotDate = new Date(`${date}T${formatTimeLabel(startMinutes)}:00.000Z`)
  if (slotDate.getTime() <= Date.now()) {
    return { state: 'past' }
  }

  return {
    state: 'free',
    payload: {
      date,
      startTime: formatTimeLabel(startMinutes),
      endTime: formatTimeLabel(endMinutes),
    },
  }
}

export default function CoachingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const [modalities, setModalities] = useState([])
  const [modalitiesLoading, setModalitiesLoading] = useState(true)
  const [modalitiesError, setModalitiesError] = useState('')
  const [selectedModalityId, setSelectedModalityId] = useState('')

  const [teachers, setTeachers] = useState([])
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [teachersError, setTeachersError] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const [availabilityWindows, setAvailabilityWindows] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [requestNotes, setRequestNotes] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestSubmitError, setRequestSubmitError] = useState('')
  const [requestSubmitSuccess, setRequestSubmitSuccess] = useState('')

  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestDetailLoading, setRequestDetailLoading] = useState(false)
  const [requestDetailError, setRequestDetailError] = useState('')

  const [studentResponseNotes, setStudentResponseNotes] = useState('')
  const [studentResponseSaving, setStudentResponseSaving] = useState(false)
  const [studentResponseError, setStudentResponseError] = useState('')

  const weekStart = useMemo(() => getWeekMondayISO(weekOffset), [weekOffset])
  const weekDates = useMemo(() => buildWeekDates(weekStart), [weekStart])

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')

  const selectedModality = useMemo(
    () => modalities.find((modality) => String(modality.modalityId) === String(selectedModalityId)) || null,
    [modalities, selectedModalityId],
  )

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => String(teacher.teacherId) === String(selectedTeacherId)) || null,
    [teachers, selectedTeacherId],
  )

  const stepNumber = !selectedModalityId ? 1 : !selectedTeacherId ? 2 : 3

  const availabilityByDate = useMemo(
    () => buildTeacherAvailabilityMap(availabilityWindows, selectedTeacherId),
    [availabilityWindows, selectedTeacherId],
  )

  const timeRows = useMemo(() => buildTimeRows(availabilityByDate), [availabilityByDate])

  const weekLabel = useMemo(() => {
    if (!weekDates.length) return ''
    return `${formatDateLabel(weekDates[0])} - ${formatDateLabel(weekDates[weekDates.length - 1])}`
  }, [weekDates])

  const loadModalities = useCallback(async () => {
    setModalitiesLoading(true)
    setModalitiesError('')
    try {
      const data = await listCoachingModalities()
      setModalities(data)
    } catch (error) {
      setModalities([])
      setModalitiesError(localizeApiError(error, 'Não foi possível carregar as modalidades.'))
    } finally {
      setModalitiesLoading(false)
    }
  }, [])

  const loadTeachers = useCallback(async (modalityId) => {
    const parsedModalityId = toPositiveInt(modalityId)
    if (!parsedModalityId) {
      setTeachers([])
      return
    }

    setTeachersLoading(true)
    setTeachersError('')
    try {
      const data = await listCoachingTeachersByModality(parsedModalityId)
      setTeachers(data)
    } catch (error) {
      setTeachers([])
      setTeachersError(localizeApiError(error, 'Não foi possível carregar os professores.'))
    } finally {
      setTeachersLoading(false)
    }
  }, [])

  const loadAvailability = useCallback(async ({ modalityId, teacherId, weekStartDate }) => {
    const parsedTeacherId = toPositiveInt(teacherId)
    const parsedModalityId = toPositiveInt(modalityId)

    if (!parsedTeacherId || !parsedModalityId) {
      setAvailabilityWindows([])
      return
    }

    setAvailabilityLoading(true)
    setAvailabilityError('')

    try {
      const data = await getAvailableSlots({
        weekStart: weekStartDate,
        teacherId: parsedTeacherId,
        modalityId: parsedModalityId,
      })

      setAvailabilityWindows((data?.availabilityWindows || []).filter((windowRecord) => Number(windowRecord.teacherId) === parsedTeacherId))
    } catch (error) {
      setAvailabilityWindows([])
      setAvailabilityError(localizeApiError(error, 'Não foi possível carregar a disponibilidade do professor.'))
    } finally {
      setAvailabilityLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      const data = await listMyCoachingRequests()
      setRequests(data)
    } catch (error) {
      setRequests([])
      setRequestsError(localizeApiError(error, 'Não foi possível carregar os pedidos de coaching.'))
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const loadRequestDetail = useCallback(async (requestId) => {
    const parsedRequestId = toPositiveInt(requestId)
    if (!parsedRequestId) {
      setSelectedRequest(null)
      return
    }

    setRequestDetailLoading(true)
    setRequestDetailError('')
    try {
      const data = await getCoachingRequestById(parsedRequestId)
      setSelectedRequest(data || null)
    } catch (error) {
      setSelectedRequest(null)
      setRequestDetailError(localizeApiError(error, 'Não foi possível carregar o detalhe do pedido.'))
    } finally {
      setRequestDetailLoading(false)
    }
  }, [])

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

  useEffect(() => {
    void loadModalities()
    void loadRequests()
  }, [loadModalities, loadRequests])

  useEffect(() => {
    if (!selectedModalityId) {
      setTeachers([])
      setSelectedTeacherId('')
      setAvailabilityWindows([])
      setSelectedSlot(null)
      return
    }

    setSelectedTeacherId('')
    setAvailabilityWindows([])
    setSelectedSlot(null)
    setRequestSubmitError('')
    setRequestSubmitSuccess('')
    void loadTeachers(selectedModalityId)
  }, [selectedModalityId, loadTeachers])

  useEffect(() => {
    if (!selectedModalityId || !selectedTeacherId) {
      setAvailabilityWindows([])
      return
    }

    void loadAvailability({
      modalityId: selectedModalityId,
      teacherId: selectedTeacherId,
      weekStartDate: weekStart,
    })
  }, [selectedModalityId, selectedTeacherId, weekStart, loadAvailability])

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null)
      setStudentResponseNotes('')
      return
    }

    void loadRequestDetail(selectedRequestId)
  }, [selectedRequestId, loadRequestDetail])

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
      return
    }

    setSidebarCollapsed((value) => !value)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile])

  const handleCreateRequest = useCallback(async () => {
    if (!selectedSlot || !selectedTeacher || !selectedModality) return

    setRequestSubmitting(true)
    setRequestSubmitError('')
    setRequestSubmitSuccess('')

    try {
      const request = await createCoachingRequest({
        teacherId: selectedTeacher.teacherId,
        modalityId: selectedModality.modalityId,
        startTime: `${selectedSlot.date}T${selectedSlot.startTime}:00.000Z`,
        endTime: `${selectedSlot.date}T${selectedSlot.endTime}:00.000Z`,
        notes: requestNotes || undefined,
      })

      setRequestSubmitSuccess('Pedido submetido com sucesso. Vais receber notificações em cada etapa.')
      setSelectedSlot(null)
      setRequestNotes('')
      await loadRequests()

      const requestId = toPositiveInt(request?.requestId)
      if (requestId) {
        setSelectedRequestId(requestId)
      }
    } catch (error) {
      setRequestSubmitError(localizeApiError(error, 'Não foi possível submeter o pedido.'))
    } finally {
      setRequestSubmitting(false)
    }
  }, [selectedSlot, selectedTeacher, selectedModality, requestNotes, loadRequests])

  const handleStudentDecision = useCallback(async (decision) => {
    const requestId = toPositiveInt(selectedRequest?.requestId)
    if (!requestId) return

    setStudentResponseSaving(true)
    setStudentResponseError('')

    try {
      await respondToTeacherSuggestion(requestId, {
        decision,
        notes: studentResponseNotes || undefined,
      })

      setStudentResponseNotes('')
      await loadRequests()
      await loadRequestDetail(requestId)
    } catch (error) {
      setStudentResponseError(localizeApiError(error, 'Não foi possível atualizar a tua resposta.'))
    } finally {
      setStudentResponseSaving(false)
    }
  }, [selectedRequest, studentResponseNotes, loadRequests, loadRequestDetail])

  const currentTimeline = Array.isArray(selectedRequest?.actions) ? selectedRequest.actions : []

  return (
    <div className="coaching-page coaching-redesign-page">
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
                aria-label="Alternar navegação"
                onClick={handleSidebarToggle}
              >
                {isMobile ? (mobileOpen ? '✕' : '☰') : sidebarCollapsed ? '▶' : '◀'}
              </button>
              <div>
                <h2>Coaching</h2>
                <p>Modalidade, professor, horário e acompanhamento do pedido</p>
              </div>
            </div>

            <div className="topbar-right">
              <NotificationsBell pageLink="/student/notifications" />
            </div>
          </header>

          <section className="content-grid coaching-redesign-grid">
            <article className="panel coaching-flow-panel">
              <div className="flow-steps" aria-label="Etapas do pedido de coaching">
                <div className={`flow-step${stepNumber >= 1 ? ' active' : ''}`}>
                  <span>1</span>
                  <strong>Modalidade</strong>
                </div>
                <div className={`flow-step${stepNumber >= 2 ? ' active' : ''}`}>
                  <span>2</span>
                  <strong>Professor</strong>
                </div>
                <div className={`flow-step${stepNumber >= 3 ? ' active' : ''}`}>
                  <span>3</span>
                  <strong>Horário</strong>
                </div>
              </div>

              <div className="flow-block">
                <h3>1. Escolhe a modalidade</h3>
                {modalitiesError ? <p className="error-banner">{modalitiesError}</p> : null}
                <select
                  className="filter-select coaching-main-select"
                  value={selectedModalityId}
                  onChange={(event) => setSelectedModalityId(event.target.value)}
                  disabled={modalitiesLoading}
                >
                  <option value="">{modalitiesLoading ? 'A carregar modalidades...' : 'Seleciona uma modalidade'}</option>
                  {modalities.map((modality) => (
                    <option key={modality.modalityId} value={modality.modalityId}>
                      {modality.modalityName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedModalityId ? (
                <div className="flow-block">
                  <h3>2. Seleciona um professor</h3>
                  {teachersError ? <p className="error-banner">{teachersError}</p> : null}

                  {teachersLoading ? (
                    <p className="panel-subtle">A carregar professores...</p>
                  ) : teachers.length === 0 ? (
                    <p className="empty-state">Não existem professores ativos para esta modalidade.</p>
                  ) : (
                    <div className="teacher-grid" role="list" aria-label="Professores disponíveis">
                      {teachers.map((teacher) => {
                        const isSelected = String(teacher.teacherId) === String(selectedTeacherId)
                        const photoUrl = resolveMarketplacePhotoUrl(teacher.photo || '')
                        return (
                          <article
                            key={teacher.teacherId}
                            role="listitem"
                            className={`teacher-card${isSelected ? ' selected' : ''}`}
                          >
                            <div className="teacher-card-header">
                              {photoUrl ? (
                                <img className="teacher-avatar" src={photoUrl} alt={teacher.name} />
                              ) : (
                                <div className="teacher-avatar teacher-avatar-fallback" aria-hidden="true">
                                  {initials(teacher.name)}
                                </div>
                              )}
                              <div>
                                <strong>{teacher.name}</strong>
                                <small>{teacher.email || 'Email não disponível'}</small>
                              </div>
                            </div>

                            <Button
                              variant={isSelected ? 'ctaSecondary' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                setSelectedTeacherId(String(teacher.teacherId))
                                setSelectedSlot(null)
                                setRequestSubmitError('')
                                setRequestSubmitSuccess('')
                              }}
                            >
                              {isSelected ? 'Selecionado' : 'Selecionar'}
                            </Button>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {selectedTeacher ? (
                <div className="flow-block">
                  <div className="schedule-header-row">
                    <h3>3. Agenda semanal de {selectedTeacher.name}</h3>
                    <div className="week-nav">
                      <button type="button" className="week-nav-btn" onClick={() => setWeekOffset((value) => value - 1)}>
                        ‹
                      </button>
                      <span className="week-label">{weekLabel}</span>
                      <button type="button" className="week-nav-btn" onClick={() => setWeekOffset((value) => value + 1)}>
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="legend-row">
                    <span className="legend-item"><span className="legend-dot free" />Disponível</span>
                    <span className="legend-item"><span className="legend-dot busy" />Ocupado</span>
                  </div>

                  {availabilityError ? <p className="error-banner">{availabilityError}</p> : null}

                  {availabilityLoading ? (
                    <p className="panel-subtle">A carregar horários...</p>
                  ) : (
                    <div className="schedule-wrap">
                      <table className="schedule-grid coaching-slot-grid">
                        <thead>
                          <tr>
                            <th style={{ width: 72 }}>Hora</th>
                            {weekDates.map((date) => (
                              <th key={date}>
                                {DAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()]}
                                <br />
                                <span>{formatDateLabel(date)}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timeRows.map((rowMinute) => (
                            <tr key={rowMinute}>
                              <th className="time-col">{formatTimeLabel(rowMinute)}</th>
                              {weekDates.map((date) => {
                                const dayWindows = availabilityByDate.get(date) || []
                                const cellState = getCellState(dayWindows, date, rowMinute, rowMinute + 30)

                                if (cellState.state === 'free') {
                                  const isSelected = selectedSlot?.date === cellState.payload.date
                                    && selectedSlot?.startTime === cellState.payload.startTime
                                    && selectedSlot?.endTime === cellState.payload.endTime

                                  return (
                                    <td key={`${date}-${rowMinute}`} className="slot-cell slot-cell-free">
                                      <button
                                        type="button"
                                        className={`slot-pick-btn${isSelected ? ' active' : ''}`}
                                        onClick={() => {
                                          setSelectedSlot(cellState.payload)
                                          setRequestSubmitError('')
                                          setRequestSubmitSuccess('')
                                        }}
                                      >
                                        {cellState.payload.startTime}
                                      </button>
                                    </td>
                                  )
                                }

                                if (cellState.state === 'booked') {
                                  return <td key={`${date}-${rowMinute}`} className="slot-cell slot-cell-booked" />
                                }

                                if (cellState.state === 'past') {
                                  return <td key={`${date}-${rowMinute}`} className="slot-cell slot-cell-past" />
                                }

                                return <td key={`${date}-${rowMinute}`} className="slot-cell slot-cell-empty" />
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="request-composer">
                    <div>
                      <strong>Pedido atual</strong>
                      <p>
                        {selectedSlot
                          ? `${selectedModality?.modalityName} · ${selectedTeacher.name} · ${formatDateLabel(selectedSlot.date)} ${selectedSlot.startTime} - ${selectedSlot.endTime}`
                          : 'Escolhe um slot disponível para criar o pedido.'}
                      </p>
                    </div>

                    <label>
                      Notas para o professor
                      <textarea
                        rows={2}
                        value={requestNotes}
                        onChange={(event) => setRequestNotes(event.target.value)}
                        placeholder="Ex.: quero focar técnica e expressão nesta sessão"
                      />
                    </label>

                    {requestSubmitError ? <p className="error-banner">{requestSubmitError}</p> : null}
                    {requestSubmitSuccess ? <p className="success-banner">{requestSubmitSuccess}</p> : null}

                    <div className="request-composer-actions">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedSlot(null)} disabled={!selectedSlot || requestSubmitting}>
                        Limpar
                      </Button>
                      <Button variant="cta" size="sm" onClick={() => void handleCreateRequest()} disabled={!selectedSlot || requestSubmitting}>
                        {requestSubmitting ? 'A submeter...' : 'Submeter pedido'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="panel coaching-requests-panel">
              <div className="requests-header">
                <div>
                  <h3>Os meus pedidos de coaching</h3>
                  <p>Acompanhamento do estado, respostas e Linha Temporal</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void loadRequests()}>
                  Atualizar
                </Button>
              </div>

              {requestsError ? <p className="error-banner">{requestsError}</p> : null}

              {requestsLoading ? (
                <p className="panel-subtle">A carregar pedidos...</p>
              ) : requests.length === 0 ? (
                <p className="empty-state">Ainda não tens pedidos de coaching.</p>
              ) : (
                <div className="request-list" role="list" aria-label="Pedidos de coaching">
                  {requests.map((request) => {
                    const meta = requestStatusMeta(request.status)
                    const active = Number(request.requestId) === Number(selectedRequestId)
                    return (
                      <button
                        key={request.requestId}
                        type="button"
                        role="listitem"
                        className={`request-list-item${active ? ' selected' : ''}`}
                        onClick={() => setSelectedRequestId(request.requestId)}
                      >
                        <div>
                          <strong>#{request.requestId} · {request.modalityName || 'Modalidade'}</strong>
                          <small>{studentFullName(request.teacher)} · {formatDateTimeLabel(request.currentStartTime)}</small>
                        </div>
                        <Badge size="sm" variant={meta.variant}>{meta.label}</Badge>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="request-detail">
                <h4>Detalhe do pedido</h4>

                {requestDetailError ? <p className="error-banner">{requestDetailError}</p> : null}

                {requestDetailLoading ? (
                  <p className="panel-subtle">A carregar detalhe...</p>
                ) : !selectedRequest ? (
                  <p className="empty-state">Seleciona um pedido para ver o detalhe completo.</p>
                ) : (
                  <>
                    <div className="request-detail-header">
                      <div>
                        <strong>Pedido #{selectedRequest.requestId}</strong>
                        <p>{selectedRequest.modalityName} · {studentFullName(selectedRequest.teacher)}</p>
                      </div>
                      <Badge variant={requestStatusMeta(selectedRequest.status).variant}>
                        {requestStatusMeta(selectedRequest.status).label}
                      </Badge>
                    </div>

                    <div className="request-detail-grid">
                      <span>
                        <strong>Horário atual</strong>
                        {formatDateTimeLabel(selectedRequest.currentStartTime)} - {formatDateTimeLabel(selectedRequest.currentEndTime)}
                      </span>
                      <span>
                        <strong>Pedido inicial</strong>
                        {formatDateTimeLabel(selectedRequest.preferredStartTime)} - {formatDateTimeLabel(selectedRequest.preferredEndTime)}
                      </span>
                      <span>
                        <strong>Criado em</strong>
                        {formatDateTimeLabel(selectedRequest.requestedAt)}
                      </span>
                      <span>
                        <strong>Estúdio</strong>
                        {selectedRequest.studioName || 'A definir na aprovação final'}
                      </span>
                    </div>

                    {selectedRequest.status === 'PENDING_STUDENT_CONFIRMATION' ? (
                      <div className="suggestion-box">
                        <h5>O professor sugeriu um novo horário</h5>
                        <p>
                          {selectedRequest.suggestedStartTime && selectedRequest.suggestedEndTime
                            ? `${formatDateTimeLabel(selectedRequest.suggestedStartTime)} - ${formatDateTimeLabel(selectedRequest.suggestedEndTime)}`
                            : 'Sem horário sugerido.'}
                        </p>
                        <label>
                          Resposta para o professor
                          <textarea
                            rows={2}
                            value={studentResponseNotes}
                            onChange={(event) => setStudentResponseNotes(event.target.value)}
                            placeholder="Ex.: este horário funciona para mim"
                          />
                        </label>
                        {studentResponseError ? <p className="error-banner">{studentResponseError}</p> : null}
                        <div className="request-composer-actions">
                          <Button variant="danger" size="sm" onClick={() => void handleStudentDecision('reject')} disabled={studentResponseSaving}>
                            Rejeitar
                          </Button>
                          <Button variant="cta" size="sm" onClick={() => void handleStudentDecision('accept')} disabled={studentResponseSaving}>
                            {studentResponseSaving ? 'A guardar...' : 'Aceitar'}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="request-timeline">
                      <h5>Linha Temporal</h5>
                      {currentTimeline.length === 0 ? (
                        <p className="panel-subtle">Ainda não há ações registadas.</p>
                      ) : (
                        <ol>
                          {currentTimeline.map((action) => (
                            <li key={action.requestActionId}>
                              <div className="timeline-head">
                                <strong>{actionLabel(action.actionType)}</strong>
                                <small>{formatDateTimeLabel(action.createdAt)}</small>
                              </div>
                              <p>{studentFullName(action.actor)}</p>
                              {action.message ? <p>{action.message}</p> : null}
                              {action.proposedStartTime && action.proposedEndTime ? (
                                <small>
                                  {formatDateTimeLabel(action.proposedStartTime)} - {formatDateTimeLabel(action.proposedEndTime)}
                                </small>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
