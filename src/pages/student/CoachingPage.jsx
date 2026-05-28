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
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import {
  createCoachingRequest,
  getCoachingRequestById,
  getTeacherCoachingAvailability,
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

function parseTimeToMinutes(value) {
  const [hours, mins] = String(value || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null
  return (hours * 60) + mins
}

function isoDateTime(dateValue, timeValue) {
  return `${dateValue}T${timeValue}:00.000Z`
}

function formatDateTimeRangeLabel(startValue, endValue) {
  if (!startValue) return '—'
  const startLabel = formatDateTimeLabel(startValue)
  return endValue ? `${startLabel} - ${formatDateTimeLabel(endValue)}` : `${startLabel} - A definir`
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

function isValidBookingTime(value) {
  const minutes = parseTimeToMinutes(value)
  if (minutes == null) return false
  return minutes >= (9 * 60) && minutes <= (23 * 60)
}

function isAllowedBookingDate(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00.000Z`)
  const day = parsed.getUTCDay()
  return Number.isFinite(parsed.getTime()) && day >= 1 && day <= 6
}

function timeFallsInsideRange(dateValue, timeValue, startValue, endValue) {
  if (!dateValue || !timeValue || !startValue || !endValue) return false
  const selected = new Date(isoDateTime(dateValue, timeValue))
  const start = new Date(startValue)
  const end = new Date(endValue)
  if ([selected, start, end].some((value) => Number.isNaN(value.getTime()))) return false
  return selected >= start && selected < end
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

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStartTime, setSelectedStartTime] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestSubmitError, setRequestSubmitError] = useState('')
  const [requestSubmitSuccess, setRequestSubmitSuccess] = useState('')
  const [toast, setToast] = useState(null)

  const [teacherSchedule, setTeacherSchedule] = useState(null)
  const [teacherScheduleLoading, setTeacherScheduleLoading] = useState(false)
  const [teacherScheduleError, setTeacherScheduleError] = useState('')

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

  const selectedDateUnavailabilities = useMemo(() => {
    const day = teacherSchedule?.days?.find((item) => item.date === selectedDate)
    return Array.isArray(day?.unavailabilities) ? day.unavailabilities : []
  }, [teacherSchedule, selectedDate])

  const selectedTimeUnavailable = useMemo(() => (
    selectedDateUnavailabilities.some((absence) =>
      timeFallsInsideRange(selectedDate, selectedStartTime, absence.startDate, absence.endDate)
    )
  ), [selectedDate, selectedDateUnavailabilities, selectedStartTime])

  const stepNumber = !selectedModalityId ? 1 : !selectedTeacherId ? 2 : 3

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

  const loadTeacherSchedule = useCallback(async () => {
    const parsedTeacherId = toPositiveInt(selectedTeacherId)
    const parsedModalityId = toPositiveInt(selectedModalityId)

    if (!parsedTeacherId || !parsedModalityId) {
      setTeacherSchedule(null)
      setTeacherScheduleError('')
      return
    }

    setTeacherScheduleLoading(true)
    setTeacherScheduleError('')
    try {
      const data = await getTeacherCoachingAvailability({
        teacherId: parsedTeacherId,
        modalityId: parsedModalityId,
        weekStart,
      })
      setTeacherSchedule(data)
    } catch (error) {
      setTeacherSchedule(null)
      setTeacherScheduleError(localizeApiError(error, 'Não foi possível verificar a indisponibilidade do professor.'))
    } finally {
      setTeacherScheduleLoading(false)
    }
  }, [selectedDate, selectedModalityId, selectedTeacherId, weekStart])

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
      setSelectedDate('')
      setSelectedStartTime('')
      return
    }

    setSelectedTeacherId('')
    setSelectedDate('')
    setSelectedStartTime('')
    setRequestSubmitError('')
    setRequestSubmitSuccess('')
    void loadTeachers(selectedModalityId)
  }, [selectedModalityId, loadTeachers])

  useEffect(() => {
    if (!selectedModalityId || !selectedTeacherId) {
      setSelectedDate('')
      setSelectedStartTime('')
      setTeacherSchedule(null)
      setTeacherScheduleError('')
      return
    }
    if (!selectedDate || !weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0] || '')
    }
  }, [selectedModalityId, selectedTeacherId, weekDates, selectedDate])

  useEffect(() => {
    void loadTeacherSchedule()
  }, [loadTeacherSchedule])

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
    if (!selectedDate || !selectedStartTime || !selectedTeacher || !selectedModality) return

    if (!isAllowedBookingDate(selectedDate)) {
      setRequestSubmitError('A data selecionada tem de ser entre segunda-feira e sábado.')
      return
    }

    if (!isValidBookingTime(selectedStartTime)) {
      setRequestSubmitError('A hora tem de estar entre as 09:00 e as 23:00.')
      return
    }

    if (selectedTimeUnavailable) {
      const message = 'O professor não está disponível nessa hora.'
      setRequestSubmitError(message)
      setToast({ variant: 'danger', title: 'Professor indisponível', description: message })
      return
    }

    setRequestSubmitting(true)
    setRequestSubmitError('')
    setRequestSubmitSuccess('')

    try {
      const request = await createCoachingRequest({
        teacherId: selectedTeacher.teacherId,
        modalityId: selectedModality.modalityId,
        startTime: isoDateTime(selectedDate, selectedStartTime),
        notes: requestNotes || undefined,
      })

      setRequestSubmitSuccess('Pedido submetido com sucesso. O professor irá definir a duração.')
      setSelectedStartTime('')
      setRequestNotes('')
      await loadRequests()

      const requestId = toPositiveInt(request?.requestId)
      if (requestId) {
        setSelectedRequestId(requestId)
      }
    } catch (error) {
      const message = localizeApiError(error, 'Não foi possível submeter o pedido.')
      setRequestSubmitError(message)
      if (message.toLowerCase().includes('professor') && message.toLowerCase().includes('dispon')) {
        setToast({ variant: 'danger', title: 'Professor indisponível', description: message })
      }
    } finally {
      setRequestSubmitting(false)
    }
  }, [selectedDate, selectedStartTime, selectedTeacher, selectedModality, selectedTimeUnavailable, requestNotes, loadRequests])

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
                                setSelectedDate('')
                                setSelectedStartTime('')
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
                    <h3>3. Escolhe a hora</h3>
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

                  <div className="request-composer">
                    <div className="request-detail-grid">
                      <label>
                        Data
                        <select
                          value={selectedDate}
                          onChange={(event) => {
                            setSelectedDate(event.target.value)
                            setRequestSubmitError('')
                            setRequestSubmitSuccess('')
                          }}
                          disabled={!weekDates.length}
                        >
                          {weekDates.map((date) => (
                            <option key={date} value={date}>
                              {DAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()]} · {formatDateLabel(date)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Hora
                        <input
                          type="time"
                          min="09:00"
                          max="23:00"
                          step="300"
                          className="coaching-time-input"
                          value={selectedStartTime}
                          onChange={(event) => {
                            setSelectedStartTime(event.target.value)
                            setRequestSubmitError('')
                            setRequestSubmitSuccess('')
                          }}
                        />
                      </label>
                    </div>

                    <p className="bk-hint" style={{ margin: 0 }}>
                      Horário livre entre segunda e sábado, das 09:00 às 23:00.
                    </p>

                    {teacherScheduleLoading ? (
                      <p className="bk-hint" style={{ margin: 0 }}>
                        A verificar indisponibilidades do professor...
                      </p>
                    ) : null}

                    {teacherScheduleError ? (
                      <p className="teacher-unavailability-warning">{teacherScheduleError}</p>
                    ) : null}

                    {selectedDateUnavailabilities.length > 0 ? (
                      <div className="teacher-unavailability-warning" role="status">
                        <strong>Professor indisponível neste dia:</strong>
                        <ul>
                          {selectedDateUnavailabilities.map((absence) => (
                            <li key={absence.absenceId}>
                              {absence.label || formatDateTimeRangeLabel(absence.startDate, absence.endDate)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div>
                      <strong>Pedido atual</strong>
                      <p>
                        {selectedDate && selectedStartTime
                          ? `${selectedModality?.modalityName} · ${selectedTeacher.name} · ${formatDateLabel(selectedDate)} ${selectedStartTime}`
                          : 'Escreve a hora para criar o pedido. A duração será definida pelo professor.'}
                      </p>
                    </div>

                    <label>
                      Notas para o professor
                      <textarea
                        rows={2}
                        value={requestNotes}
                        onChange={(event) => setRequestNotes(event.target.value)}
                        placeholder=""
                      />
                    </label>

                    {requestSubmitError ? <p className="error-banner">{requestSubmitError}</p> : null}
                    {requestSubmitSuccess ? <p className="success-banner">{requestSubmitSuccess}</p> : null}

                    <div className="request-composer-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedStartTime('')}
                        disabled={!selectedDate || !selectedStartTime || requestSubmitting}
                      >
                        Limpar hora
                      </Button>
                      <Button
                        variant="cta"
                        size="sm"
                        onClick={() => void handleCreateRequest()}
                        disabled={!selectedDate || !selectedStartTime || requestSubmitting}
                      >
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
                        {formatDateTimeRangeLabel(selectedRequest.currentStartTime, selectedRequest.currentEndTime)}
                      </span>
                      <span>
                        <strong>Pedido inicial</strong>
                        {formatDateTimeRangeLabel(selectedRequest.preferredStartTime, selectedRequest.preferredEndTime)}
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
                          {selectedRequest.suggestedStartTime
                            ? formatDateTimeRangeLabel(selectedRequest.suggestedStartTime, selectedRequest.suggestedEndTime)
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
      {toast ? (
        <Toast
          open
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  )
}
