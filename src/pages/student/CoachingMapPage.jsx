/**
 * @file src/pages/student/CoachingMapPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 *
 * Mapa semanal de sessões de coaching — vista expandida para o aluno.
 * Filtros persistidos em localStorage. Segue o padrão CSS do CoachingPage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { createBooking, getAvailableSlots, getCompatibleStudios, requestJoinSession } from '../../services/coaching'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import NotificationsBell from '../../components/NotificationsBell'
import UnavailabilityModal from '../../components/teacher/UnavailabilityModal'
import { fetchAbsenceDetails } from '../../services/teacherAvailability'
import './coaching.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import { canJoinSession } from '../../utils/coachingSession'

const STORAGE_KEY = 'coaching_map_filters'

const DAYS_SHORT = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function getWeekMondayISO(offset = 0) {
  const now = new Date()
  const dow = now.getDay() || 7
  now.setUTCHours(0, 0, 0, 0)
  now.setDate(now.getDate() - dow + 1 + offset * 7)
  return now.toISOString().slice(0, 10)
}

function buildWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(weekStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function formatDatePT(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

function combineDateTime(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00.000Z`
}

function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = String(timeStr || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return ''
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function resolveSlotClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('pending') || s.includes('reject')) return 'busy'
  if (s.includes('final') || s.includes('complet') || s.includes('done')) return 'busy'
  if (s.includes('confirm') || s.includes('active')) return 'pending-direction'
  return 'free'
}

function resolveSessionLabel({ status, spotsLeft }) {
  const s = String(status || '').toLowerCase()
  if (s.includes('final') || s.includes('complet') || s.includes('done')) {
    return { label: 'Finalizada', variant: 'neutral' }
  }
  if (spotsLeft <= 0) {
    return { label: 'Lotação completa', variant: 'danger' }
  }
  if (s.includes('pending') || s.includes('reject')) {
    return { label: 'Pendente / Rejeitada', variant: 'warning' }
  }
  if (s.includes('confirm') || s.includes('active')) {
    return { label: 'Confirmada', variant: 'info' }
  }
  return { label: 'Com vagas', variant: 'success' }
}

function CoachingMapPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const [filterTeacherId, setFilterTeacherId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.teacherId || '' } catch { return '' }
  })
  const [filterModalityId, setFilterModalityId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.modalityId || '' } catch { return '' }
  })

  const [slotsData, setSlotsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [joiningSession, setJoiningSession] = useState(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    teacherId: '',
    studioId: '',
    modalityId: '',
    date: '',
    startTime: '',
    durationMin: '60',
    notes: '',
  })
  const [compatibleStudios, setCompatibleStudios] = useState([])
  const [studiosLoading, setStudiosLoading] = useState(false)
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingFieldErrors, setBookingFieldErrors] = useState({})

  const displayName = user?.fullName || user?.name || user?.email || 'Aluno'

  const weekStart = useMemo(() => getWeekMondayISO(weekOffset), [weekOffset])
  const weekDates = useMemo(() => buildWeekDates(weekStart), [weekStart])

  const sidebarHidden = isMobile ? !mobileOpen : sidebarCollapsed
  const appShellCls = `app-shell${sidebarHidden ? ' sidebar-hidden' : ''}`
  const sidebarCls = `sidebar${isMobile && mobileOpen ? ' open' : ''}`

  // Persist filters
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teacherId: filterTeacherId, modalityId: filterModalityId }))
  }, [filterTeacherId, filterModalityId])

  const loadMap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAvailableSlots({
        weekStart,
        teacherId: filterTeacherId || undefined,
        modalityId: filterModalityId || undefined,
      })
      setSlotsData(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Sem sessões disponíveis para esta semana.')
      setSlotsData(null)
    } finally {
      setLoading(false)
    }
  }, [weekStart, filterTeacherId, filterModalityId])

  useEffect(() => { void loadMap() }, [loadMap])

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
    document.body.classList.add('coaching-page')
    return () => document.body.classList.remove('coaching-page')
  }, [])

  const handleLogout = async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  // Data derived from slotsData (same structure as CoachingPage)
  const teachers = slotsData?.teachers ?? []
  const modalities = slotsData?.modalities ?? []
  const visibleDates = weekDates.slice(0, 6) // Mon–Sat

  // Build time-based map: windowStart (HH:MM) → date → windows[]
  const timeMap = useMemo(() => {
    const map = new Map() // "HH:MM" → Map<date, window[]>
    for (const win of slotsData?.availabilityWindows ?? []) {
      if (!map.has(win.windowStart)) map.set(win.windowStart, new Map())
      const dateMap = map.get(win.windowStart)
      if (!dateMap.has(win.date)) dateMap.set(win.date, [])
      dateMap.get(win.date).push(win)
    }
    return map
  }, [slotsData?.availabilityWindows])

  // Sorted list of unique start times (rows)
  const timeRows = useMemo(() => [...timeMap.keys()].sort(), [timeMap])

  // Helper: teacher name from id
  const teacherName = (id) => teachers.find((t) => t.teacherId === id)?.name ?? `#${id}`

  const teacherDefaultModalityId = useCallback((teacherId) => {
    const teacher = teachers.find((t) => String(t.teacherId) === String(teacherId))
    return filterModalityId || teacher?.modalityIds?.[0] || ''
  }, [filterModalityId, teachers])

  const openBooking = useCallback((prefill = {}) => {
    setBookingForm({
      teacherId: String(prefill.teacherId ?? ''),
      studioId: '',
      modalityId: String(prefill.modalityId ?? teacherDefaultModalityId(prefill.teacherId) ?? ''),
      date: prefill.date ?? '',
      startTime: prefill.startTime ?? '',
      durationMin: '60',
      notes: '',
    })
    setBookingError('')
    setBookingFieldErrors({})
    setJoinSuccess('')
    setBookingOpen(true)
  }, [teacherDefaultModalityId])

  useEffect(() => {
    if (!bookingForm.modalityId) {
      setCompatibleStudios([])
      return
    }

    setStudiosLoading(true)
    getCompatibleStudios(bookingForm.modalityId)
      .then(setCompatibleStudios)
      .catch(() => setCompatibleStudios([]))
      .finally(() => setStudiosLoading(false))
  }, [bookingForm.modalityId])

  const handleBookingSubmit = useCallback(async () => {
    const { teacherId, studioId, modalityId, date, startTime, durationMin, notes } = bookingForm
    const fieldErrors = {}

    if (!teacherId) fieldErrors.teacherId = true
    if (!modalityId) fieldErrors.modalityId = true
    if (!studioId) fieldErrors.studioId = true
    if (!date) fieldErrors.date = true
    if (!startTime) fieldErrors.startTime = true

    if (Object.keys(fieldErrors).length > 0) {
      setBookingFieldErrors(fieldErrors)
      setBookingError('Preenche todos os campos obrigatórios.')
      return
    }

    const endTime = addMinutesToTime(startTime, Number(durationMin))

    if (!endTime) {
      setBookingFieldErrors({ startTime: true })
      setBookingError('Hora de início inválida.')
      return
    }

    setBookingSaving(true)
    setBookingError('')
    setBookingFieldErrors({})

    try {
      await createBooking({
        teacherId: Number(teacherId),
        studioId: Number(studioId),
        modalityId: Number(modalityId),
        startTime: combineDateTime(date, startTime),
        endTime: combineDateTime(date, endTime),
        notes: notes || undefined,
      })
      setBookingOpen(false)
      setJoinSuccess('Pedido de marcação enviado para validação.')
      await loadMap()
    } catch (err) {
      setBookingError(err?.response?.data?.error || 'Não foi possível submeter a marcação.')
    } finally {
      setBookingSaving(false)
    }
  }, [bookingForm, loadMap])

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return ''
    return `${formatDatePT(visibleDates[0])} – ${formatDatePT(visibleDates[5])}`
  }, [visibleDates])

  // Teacher unavailability modal state
  const [unavailOpen, setUnavailOpen] = useState(false)
  const [unavailSlot, setUnavailSlot] = useState(null)

  const selectSt = {
    border: '1px solid var(--coaching-input-border)',
    borderRadius: '10px',
    padding: '7px 10px',
    background: 'var(--coaching-input-bg)',
    color: 'var(--coaching-ink)',
    font: 'inherit',
    fontSize: '0.875rem',
  }

  return (
    <div className="coaching-page">
    <div className={appShellCls}>
      {isMobile && mobileOpen ? (
        <button type="button" className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside className={sidebarCls} id="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div><h1>gestArtes</h1><p>{displayName}</p></div>
        </div>
        <div className="nav-group">
          <h2>Aluno</h2>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} className={`nav-link${location.pathname === item.href ? ' active' : ''}`} to={item.href}>
              {item.label}
            </Link>
          ))}
          <a className="nav-link" href="/login" onClick={handleLogout}>Terminar Sessão</a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="sidebar-toggle-btn" aria-label="Toggle sidebar" onClick={() => isMobile ? setMobileOpen((v) => !v) : setSidebarCollapsed((v) => !v)}>
              {isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')}
            </button>
            <div>
              <h2>Mapa de Coaching</h2>
              <p>Vista expandida — encontra blocos livres e adere a sessões disponíveis</p>
            </div>
          </div>
          <div className="topbar-right">
            <button type="button" className="slot-btn primary" style={{ padding: '7px 14px' }} onClick={() => openBooking()}>
              Criar marcação
            </button>
            <Link className="slot-btn primary" to="/student/coaching" style={{ textDecoration: 'none', padding: '7px 14px' }}>← Voltar</Link>
            <NotificationsBell pageLink="/student/notifications" />
          </div>
        </header>

        <section className="content-grid" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
          {joinSuccess ? (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 14px', color: '#065f46', fontWeight: 600 }}>
              {joinSuccess}
            </div>
          ) : null}

          <div className="coaching-grid-panel" style={{
            background: 'var(--coaching-panel-bg, #fff)',
            border: '1px solid var(--coaching-border, #e5e7eb)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
              <select value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)} style={selectSt}>
                <option value="">Todos os professores</option>
                {teachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}</option>)}
              </select>
              <select value={filterModalityId} onChange={(e) => setFilterModalityId(e.target.value)} style={selectSt}>
                <option value="">Todas as modalidades</option>
                {modalities.map((m) => <option key={m.modalityId} value={m.modalityId}>{m.modalityName}</option>)}
              </select>
              {(filterTeacherId || filterModalityId) ? (
                <button type="button" className="slot-btn" style={{ padding: '7px 14px', fontSize: '0.85rem' }} onClick={() => { setFilterTeacherId(''); setFilterModalityId('') }}>
                  Limpar filtros
                </button>
              ) : null}
            </div>

            {/* Week nav */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button type="button" className="slot-btn" style={{ padding: '6px 14px' }} onClick={() => setWeekOffset((n) => n - 1)}>← Anterior</button>
              <span style={{ padding: '5px 12px', background: 'var(--coaching-chip-bg, #f3f4f6)', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600 }}>
                {weekLabel}
              </span>
              <button type="button" className="slot-btn" style={{ padding: '6px 14px' }} onClick={() => setWeekOffset((n) => n + 1)}>Seguinte →</button>
            </div>

            {/* Legend */}
            <div className="legend-row" style={{ marginBottom: '14px' }}>
              <span className="legend-item"><span className="legend-dot busy" />Pendente / Rejeitado</span>
              <span className="legend-item"><span className="legend-dot pending-direction" />Confirmado</span>
              <span className="legend-item"><span className="legend-dot free" />Com vagas</span>
            </div>

            {/* Grid */}
            {loading ? (
              <p style={{ textAlign: 'center', opacity: 0.6, padding: '32px 0' }}>A carregar mapa...</p>
            ) : (
              <>
                {error ? (
                  <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', color: '#92400e', fontSize: '0.875rem' }}>
                    ℹ {error}
                  </div>
                ) : null}
                <div className="schedule-board" style={{ overflowX: 'auto' }}>
                  <table className="schedule-grid" style={{ minWidth: '680px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 72, minWidth: 60 }}>Hora</th>
                        {visibleDates.map((date) => {
                          const dow = new Date(date + 'T00:00:00Z').getUTCDay()
                          return (
                            <th key={date}>
                              {DAYS_SHORT[dow]}<br />
                              <span style={{ fontWeight: 400, fontSize: '0.76rem' }}>{formatDatePT(date)}</span>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', opacity: 0.5 }}>
                            Sem sessões disponíveis para esta semana.
                          </td>
                        </tr>
                      ) : (
                        timeRows.map((time) => (
                          <tr key={time}>
                            <th className="time-col" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--coaching-accent, #7c3aed)', background: 'rgba(124,58,237,.05)' }}>
                              {time}
                            </th>
                            {visibleDates.map((date) => {
                              const dayWindows = timeMap.get(time)?.get(date) ?? []
                              if (dayWindows.length === 0) {
                                return (
                                  <td key={date}>
                                    <div className="slot free" style={{ opacity: 0.12, minHeight: '36px' }} />
                                  </td>
                                )
                              }
                              return (
                                <td key={date} style={{ verticalAlign: 'top', padding: '4px' }}>
                                  {dayWindows.map((win, wi) => (
                                    <div key={wi} style={{ marginBottom: wi < dayWindows.length - 1 ? '6px' : 0 }}>
                                      {/* Teacher label + window end */}
                                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                                        <span>{teacherName(win.teacherId)}</span>
                                        <span style={{ fontWeight: 400, opacity: 0.6 }}>até {win.windowEnd}</span>
                                      </div>
                                      {/* Booked sessions inside this window */}
                                      {win.bookedSessions?.length > 0 ? (
                                        win.bookedSessions.map((sess) => {
                                          const spotsLeft = (sess.maxParticipants ?? 0) - (sess.enrolledCount ?? 0)
                                          const cls = resolveSlotClass(sess.status)
                                          const modName = modalities.find((m) => m.modalityId === sess.modalityId)?.modalityName ?? ''
                                          const startH = new Date(sess.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                          const endH = sess.endTime ? new Date(sess.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''

                                          const statusLower = String(sess.status || '').toLowerCase()
                                          const showsUnavailBtn = statusLower.includes('teacher') || statusLower.includes('prof') || statusLower.includes('pend') || statusLower.includes('reject')

                                          return (
                                            <div key={sess.sessionId} className={`slot ${cls}`}>
                                              <strong style={{ fontSize: '0.8rem' }}>#{sess.sessionId} · {startH}{endH ? `–${endH}` : ''}</strong>
                                              {modName ? <small style={{ display: 'block' }}>{modName}</small> : null}
                                              <small style={{ display: 'block', color: spotsLeft > 0 ? '#059669' : '#dc2626' }}>
                                                {sess.enrolledCount}/{sess.maxParticipants} inscritos{spotsLeft > 0 ? ` · ${spotsLeft} vaga${spotsLeft !== 1 ? 's' : ''}` : ' · Lotação completa'}
                                              </small>
                                              <small style={{ display: 'block', fontWeight: 600, color: resolveSessionLabel({ status: sess.status, spotsLeft }).variant === 'danger' ? '#dc2626' : '#374151' }}>
                                                {resolveSessionLabel({ status: sess.status, spotsLeft }).label}
                                              </small>
                                                {sess.userIsEnrolled ? (
                                                  <div style={{ marginTop: '6px' }}>
                                                    <Badge variant="success" size="sm">Já inscrito</Badge>
                                                  </div>
                                                ) : sess.userJoinRequestStatus ? (
                                                <div style={{ marginTop: '6px' }}>
                                                  <small style={{ display: 'block', padding: '4px 6px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                                    ✓ Pedido pendente
                                                  </small>
                                                </div>
                                                ) : canJoinSession({
                                                  sessionStatus: sess.status,
                                                  sessionStartTime: sess.startTime,
                                                  sessionEndTime: sess.endTime,
                                                  hasSpots: spotsLeft > 0,
                                                  userIsEnrolled: sess.userIsEnrolled,
                                                }) ? (
                                                <div className="slot-actions">
                                                  <button
                                                    type="button"
                                                    className="slot-btn primary"
                                                    onClick={() => { setJoiningSession({ ...sess, teacherName: teacherName(win.teacherId), modalityName: modName }); setJoinError(''); setJoinSuccess('') }}
                                                  >
                                                    Juntar
                                                  </button>
                                                </div>
                                              ) : null}
                                              {showsUnavailBtn ? (
                                                <div style={{ marginTop: 8 }}>
                                                  <button type="button" className="slot-btn" onClick={async () => {
                                                    let details = null
                                                    try {
                                                      details = await fetchAbsenceDetails(win.teacherId, { start: sess.startTime })
                                                    } catch { details = null }
                                                    setUnavailSlot({ ...sess, teacherId: win.teacherId, details })
                                                    setUnavailOpen(true)
                                                  }}>
                                                    Ver indisponibilidade
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>
                                          )
                                        })
                                      ) : (
                                        <div className="slot free">
                                          <small style={{ display: 'block' }}>Disponível para marcação</small>
                                          <div className="slot-actions">
                                            <button
                                              type="button"
                                              className="slot-btn primary"
                                              onClick={() => openBooking({
                                                teacherId: win.teacherId,
                                                date: win.date,
                                                startTime: win.windowStart,
                                              })}
                                            >
                                              Marcar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </td>
                              )
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Join modal */}
      {joiningSession ? (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setJoiningSession(null) }}
        >
          <div className="coaching-modal" style={{ maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Aderir à sessão</h3>
              <button type="button" className="slot-btn" style={{ padding: '4px 10px' }} onClick={() => setJoiningSession(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
              <p style={{ margin: 0 }}><strong>Professor:</strong> {joiningSession.teacherName}</p>
              {joiningSession.modalityName ? <p style={{ margin: 0 }}><strong>Modalidade:</strong> {joiningSession.modalityName}</p> : null}
              {joiningSession.startTime ? (
                <p style={{ margin: 0 }}><strong>Início:</strong> {new Date(joiningSession.startTime).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</p>
              ) : joiningSession.windowStart ? (
                <p style={{ margin: 0 }}><strong>Hora:</strong> {joiningSession.windowStart}</p>
              ) : null}
            </div>
            {joinError ? <p style={{ color: '#dc2626', margin: '0 0 10px', fontSize: '0.875rem' }}>{joinError}</p> : null}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="slot-btn primary" disabled={joinLoading} onClick={async () => {
                if (!joiningSession?.sessionId) { setJoinError('Sessão sem ID — contacta o professor diretamente.'); return }
                setJoinLoading(true)
                try {
                  await requestJoinSession(joiningSession.sessionId)
                  setJoinSuccess('Pedido enviado!'); setJoiningSession(null); void loadMap()
                } catch (err) { 
                  const status = err?.response?.status
                  if (status === 409) {
                    setJoinError('Já estás inscrito nesta sessão.');
                  } else {
                    setJoinError(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao enviar pedido.')
                  }
                }
                finally { setJoinLoading(false) }
              }}>
                {joinLoading ? 'A enviar...' : 'Confirmar adesão'}
              </button>
              <button type="button" className="slot-btn" onClick={() => setJoiningSession(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
      <Modal
        open={bookingOpen}
        title="Nova marcação de coaching"
        size="lg"
        className="coaching-modal"
        onClose={() => setBookingOpen(false)}
        footer={(
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setBookingOpen(false)} disabled={bookingSaving}>
              Cancelar
            </Button>
            <Button variant="cta" onClick={() => void handleBookingSubmit()} disabled={bookingSaving}>
              {bookingSaving ? 'A submeter...' : 'Submeter pedido'}
            </Button>
          </div>
        )}
      >
        <div className="bk-form">
          {bookingError ? <div className="bk-error">{bookingError}</div> : null}

          <div className="bk-section">
            <p className="bk-section-title">Quem</p>
            <div className="bk-row">
              <label className={bookingFieldErrors.teacherId ? 'err' : ''}>
                <span>Professor <span className="bk-req">*</span></span>
                <select
                  value={bookingForm.teacherId}
                  onChange={(e) => setBookingForm((form) => ({
                    ...form,
                    teacherId: e.target.value,
                    modalityId: form.modalityId || String(teacherDefaultModalityId(e.target.value)),
                    studioId: '',
                  }))}
                >
                  <option value="">Selecionar professor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacherId} value={teacher.teacherId}>{teacher.name}</option>
                  ))}
                </select>
              </label>

              <label className={bookingFieldErrors.modalityId ? 'err' : ''}>
                <span>Modalidade <span className="bk-req">*</span></span>
                <select
                  value={bookingForm.modalityId}
                  onChange={(e) => setBookingForm((form) => ({ ...form, modalityId: e.target.value, studioId: '' }))}
                >
                  <option value="">Selecionar modalidade</option>
                  {modalities.map((modality) => (
                    <option key={modality.modalityId} value={modality.modalityId}>{modality.modalityName}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="bk-divider" />

          <div className="bk-section">
            <p className="bk-section-title">Onde</p>
            <label className={bookingFieldErrors.studioId ? 'err' : ''}>
              <span>
                Estúdio <span className="bk-req">*</span>
                {!bookingForm.modalityId ? (
                  <span className="bk-hint"> — seleciona primeiro a modalidade</span>
                ) : studiosLoading ? (
                  <span className="bk-hint"> — a carregar...</span>
                ) : null}
              </span>
              <select
                value={bookingForm.studioId}
                disabled={!bookingForm.modalityId || studiosLoading || compatibleStudios.length === 0}
                onChange={(e) => setBookingForm((form) => ({ ...form, studioId: e.target.value }))}
              >
                <option value="">
                  {!bookingForm.modalityId
                    ? 'Seleciona primeiro a modalidade'
                    : studiosLoading
                      ? 'A carregar estúdios...'
                      : compatibleStudios.length === 0
                        ? 'Nenhum estúdio compatível'
                        : 'Selecionar estúdio'}
                </option>
                {compatibleStudios.map((studio) => (
                  <option key={studio.studioId} value={studio.studioId}>
                    {studio.studioName} · capacidade {studio.capacity}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="bk-divider" />

          <div className="bk-section">
            <p className="bk-section-title">Quando</p>
            <div className="bk-row">
              <label className={bookingFieldErrors.date ? 'err' : ''}>
                <span>Data <span className="bk-req">*</span></span>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm((form) => ({ ...form, date: e.target.value }))}
                />
              </label>
              <label className={bookingFieldErrors.startTime ? 'err' : ''}>
                <span>Hora de início <span className="bk-req">*</span></span>
                <input
                  type="time"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm((form) => ({ ...form, startTime: e.target.value }))}
                />
              </label>
            </div>
            <div className="bk-row">
              <label>
                <span>Duração</span>
                <select
                  value={bookingForm.durationMin}
                  onChange={(e) => setBookingForm((form) => ({ ...form, durationMin: e.target.value }))}
                >
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="90">90 minutos</option>
                  <option value="120">120 minutos</option>
                </select>
              </label>
              {bookingForm.startTime ? (
                <div className="bk-time-badge">
                  {bookingForm.startTime} - {addMinutesToTime(bookingForm.startTime, Number(bookingForm.durationMin))}
                </div>
              ) : <div />}
            </div>
          </div>

          <div className="bk-divider" />

          <div className="bk-section">
            <p className="bk-section-title">Notas</p>
            <label>
              <span>Pedidos adicionais <span className="bk-hint">(opcional)</span></span>
              <textarea
                rows={3}
                value={bookingForm.notes}
                placeholder="Ex.: preferência por acompanhamento específico..."
                onChange={(e) => setBookingForm((form) => ({ ...form, notes: e.target.value }))}
              />
            </label>
          </div>

          <div className="bk-summary">
            <p className="bk-summary-label">Resumo da marcação</p>
            <p className="bk-summary-note">
              O pedido será submetido para validação antes de a sessão ficar confirmada.
            </p>
          </div>
        </div>
      </Modal>
      {/* Unavailability modal (shared component) */}
      <UnavailabilityModal
        isOpen={unavailOpen}
        onClose={() => setUnavailOpen(false)}
        onSubmit={() => setUnavailOpen(false)}
        slotData={unavailSlot}
        viewOnly={true}
        details={unavailSlot?.details}
      />
    </div>
    </div>
  )
}

export default CoachingMapPage
