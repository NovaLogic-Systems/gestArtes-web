import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import notificationPreviewService from '../../services/notificationPreviewService'
import {
  cancelBooking,
  confirmCompletion,
  createBooking,
  getAvailableSlots,
  getCompatibleStudios,
  getSessionHistory,
} from '../../services/coaching'
import './coaching.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/student/dashboard' },
  { label: 'Coaching', href: '/student/coaching' },
  { label: 'Inventário da Escola', href: '/student/inventory' },
  { label: 'Marketplace', href: '/student/marketplace' },
  { label: 'Perdidos e Achados', href: '/student/lostfound' },
  { label: 'Minha Conta', href: '/student/account' },
]

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function getWeekMondayISO(offsetWeeks = 0) {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff + offsetWeeks * 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function formatDatePT(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

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
  if (s.includes('cancel')) return { label: 'Cancelada', cls: 'danger' }
  if (s.includes('complet') || s.includes('final')) return { label: 'Finalizada', cls: 'ok' }
  if (s.includes('approv') || s.includes('schedul') || s.includes('active') || s.includes('ativa')) {
    return { label: 'Ativa', cls: 'ok' }
  }
  if (s.includes('teacher') || s.includes('professor')) return { label: 'Aguarda professor', cls: 'warn' }
  if (s.includes('admin') || s.includes('direct') || s.includes('manag')) {
    return { label: 'Aguarda direção', cls: 'info' }
  }
  if (s.includes('pend')) return { label: 'Pendente', cls: 'warn' }
  return { label: status || '—', cls: 'info' }
}

function resolveSlotClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('cancel')) return 'busy'
  if (s.includes('teacher') || s.includes('professor') || s.includes('pend')) return 'pending-teacher'
  if (s.includes('admin') || s.includes('direct')) return 'pending-direction'
  return 'busy'
}

function buildWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function combineDateTime(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00.000Z`
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ── Booking modal body (extracted to keep CoachingPage readable) ────
function BookingModalBody({
  bookingForm,
  setBookingForm,
  teachers,
  modalities,
  compatibleStudios,
  studiosLoading,
  bookingError,
  bookingFieldErrors,
  bookingFromGrid,
}) {
  const selectedTeacher = teachers.find((t) => String(t.teacherId) === bookingForm.teacherId)
  const selectedModality = modalities.find((m) => String(m.modalityId) === bookingForm.modalityId)
  const selectedStudio = compatibleStudios.find((s) => String(s.studioId) === bookingForm.studioId)
  const endTime = bookingForm.startTime
    ? addMinutesToTime(bookingForm.startTime, Number(bookingForm.durationMin))
    : null

  const hasSummary =
    selectedTeacher && selectedModality && selectedStudio && bookingForm.date && bookingForm.startTime

  const err = bookingFieldErrors

  return (
    <div className="bk-form">
      {bookingError ? <div className="bk-error">{bookingError}</div> : null}

      {bookingFromGrid ? (
        <div className="bk-prefill-chip">
          <span className="bk-prefill-dot" />
          Horário pré-selecionado do mapa — confirme os dados abaixo
        </div>
      ) : null}

      {/* Section: Quem */}
      <div className="bk-section">
        <p className="bk-section-title">Quem</p>
        <div className="bk-row">
          <label className={err.teacherId ? 'err' : ''}>
            <span>Professor <span className="bk-req">*</span></span>
            <select
              value={bookingForm.teacherId}
              onChange={(e) => setBookingForm((f) => ({ ...f, teacherId: e.target.value }))}
            >
              <option value="">Selecionar professor</option>
              {teachers.map((t) => (
                <option key={t.teacherId} value={t.teacherId}>{t.name}</option>
              ))}
            </select>
            {err.teacherId ? <span className="err-msg">Obrigatório</span> : null}
          </label>

          <label className={err.modalityId ? 'err' : ''}>
            <span>Modalidade <span className="bk-req">*</span></span>
            <select
              value={bookingForm.modalityId}
              onChange={(e) => setBookingForm((f) => ({ ...f, modalityId: e.target.value, studioId: '' }))}
            >
              <option value="">Selecionar modalidade</option>
              {modalities.map((m) => (
                <option key={m.modalityId} value={m.modalityId}>{m.modalityName}</option>
              ))}
            </select>
            {err.modalityId ? <span className="err-msg">Obrigatório</span> : null}
          </label>
        </div>

        {selectedTeacher && selectedTeacher.modalityIds && selectedTeacher.modalityIds.length > 0 ? (
          <div className="bk-chips">
            {selectedTeacher.modalityIds.map((mid) => {
              const mod = modalities.find((m) => m.modalityId === mid)
              if (!mod) return null
              const isSelected = String(bookingForm.modalityId) === String(mid)
              return (
                <button
                  key={mid}
                  type="button"
                  className={`bk-chip${isSelected ? ' selected' : ''}`}
                  onClick={() => setBookingForm((f) => ({ ...f, modalityId: String(mid), studioId: '' }))}
                >
                  {mod.modalityName}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="bk-divider" />

      {/* Section: Onde (BR-05: studios filtered by modality) */}
      <div className="bk-section">
        <p className="bk-section-title">Onde</p>
        <label className={err.studioId ? 'err' : ''}>
          <span>
            Estúdio <span className="bk-req">*</span>
            {!bookingForm.modalityId ? (
              <span className="bk-hint"> — selecione primeiro a modalidade</span>
            ) : studiosLoading ? (
              <span className="bk-hint"> — a carregar…</span>
            ) : null}
          </span>
          <select
            value={bookingForm.studioId}
            onChange={(e) => setBookingForm((f) => ({ ...f, studioId: e.target.value }))}
            disabled={!bookingForm.modalityId || studiosLoading || compatibleStudios.length === 0}
          >
            <option value="">
              {!bookingForm.modalityId
                ? 'Selecione primeiro a modalidade'
                : studiosLoading
                  ? 'A carregar estúdios…'
                  : compatibleStudios.length === 0
                    ? 'Nenhum estúdio compatível com esta modalidade'
                    : 'Selecionar estúdio'}
            </option>
            {compatibleStudios.map((s) => (
              <option key={s.studioId} value={s.studioId}>
                {s.studioName} · capacidade {s.capacity}
              </option>
            ))}
          </select>
          {err.studioId ? <span className="err-msg">Obrigatório</span> : null}
        </label>
      </div>

      <div className="bk-divider" />

      {/* Section: Quando */}
      <div className="bk-section">
        <p className="bk-section-title">Quando</p>
        <div className="bk-row">
          <label className={err.date ? 'err' : ''}>
            <span>Data <span className="bk-req">*</span></span>
            <input
              type="date"
              value={bookingForm.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBookingForm((f) => ({ ...f, date: e.target.value }))}
            />
            {err.date ? <span className="err-msg">Obrigatório</span> : null}
          </label>

          <label className={err.startTime ? 'err' : ''}>
            <span>Hora de início <span className="bk-req">*</span></span>
            <input
              type="time"
              value={bookingForm.startTime}
              onChange={(e) => setBookingForm((f) => ({ ...f, startTime: e.target.value }))}
            />
            {err.startTime ? <span className="err-msg">Obrigatório</span> : null}
          </label>
        </div>

        <div className="bk-row">
          <label>
            <span>Duração</span>
            <select
              value={bookingForm.durationMin}
              onChange={(e) => setBookingForm((f) => ({ ...f, durationMin: e.target.value }))}
            >
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
              <option value="120">120 minutos</option>
            </select>
          </label>

          {bookingForm.startTime ? (
            <div className="bk-time-badge">
              ⏱ {bookingForm.startTime} – {endTime}
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className="bk-divider" />

      {/* Section: Notas */}
      <div className="bk-section">
        <p className="bk-section-title">Notas</p>
        <label>
          <span>Pedidos adicionais <span className="bk-hint">(opcional)</span></span>
          <textarea
            rows={3}
            value={bookingForm.notes}
            placeholder="Ex.: preferência por horário após as 18h30, necessidade de acompanhamento específico…"
            onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
      </div>

      {/* Summary card — shown only when all key fields are filled */}
      {hasSummary ? (
        <>
          <div className="bk-divider" />
          <div className="bk-summary">
            <p className="bk-summary-label">Resumo da marcação</p>
            <div className="bk-summary-grid">
              <span className="bk-summary-item">
                <strong>Professor</strong>
                {selectedTeacher.name}
              </span>
              <span className="bk-summary-item">
                <strong>Modalidade</strong>
                {selectedModality.modalityName}
              </span>
              <span className="bk-summary-item">
                <strong>Estúdio</strong>
                {selectedStudio.studioName}
              </span>
              <span className="bk-summary-item">
                <strong>Data e hora</strong>
                {formatDatePT(bookingForm.date)} · {bookingForm.startTime}–{endTime}
                {' '}({bookingForm.durationMin} min)
              </span>
            </div>
            <p className="bk-summary-note">
              O pedido será submetido para validação pelo professor e pela direção antes de ser confirmado.
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function CoachingPage() {
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

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile])

  // Notifications popover
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const notificationBoxRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items ?? [])
      setNotificationsLoaded(true)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const handler = (e) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationsOpen])

  const handleNotificationsClick = () => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && !notificationsLoaded) void loadNotifications()
  }

  // ── Week grid state ────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => getWeekMondayISO(weekOffset), [weekOffset])
  const weekDates = useMemo(() => buildWeekDates(weekStart), [weekStart])

  const [slotsData, setSlotsData] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotsError, setSlotsError] = useState('')

  // Filters
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [filterModalityId, setFilterModalityId] = useState('')

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true)
    setSlotsError('')
    try {
      const data = await getAvailableSlots({
        weekStart,
        teacherId: filterTeacherId || undefined,
        modalityId: filterModalityId || undefined,
      })
      setSlotsData(data)
    } catch (err) {
      setSlotsError(err?.response?.data?.error || 'Não foi possível carregar os horários.')
    } finally {
      setSlotsLoading(false)
    }
  }, [weekStart, filterTeacherId, filterModalityId])

  useEffect(() => { void loadSlots() }, [loadSlots])

  // ── Session history ────────────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')

  const loadHistory = useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const data = await getSessionHistory()
      setSessions(data)
    } catch (err) {
      setSessionsError(err?.response?.data?.error || 'Não foi possível carregar o histórico.')
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => { void loadHistory() }, [loadHistory])

  const toConfirm = useMemo(
    () => sessions.filter((s) => s.canConfirm),
    [sessions]
  )
  const historyRows = useMemo(
    () => sessions.filter((s) => s.isPast),
    [sessions]
  )
  const upcomingRows = useMemo(
    () => sessions.filter((s) => !s.isPast && s.canCancel),
    [sessions]
  )

  // ── Booking modal ──────────────────────────────────────────────────
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
  const [bookingError, setBookingError] = useState('')
  const [bookingFieldErrors, setBookingFieldErrors] = useState({})
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingFromGrid, setBookingFromGrid] = useState(false)

  const handleOpenBooking = useCallback((prefill = {}) => {
    const fromGrid = Boolean(prefill.date && prefill.startTime)
    setBookingForm({
      teacherId: String(prefill.teacherId ?? ''),
      studioId: '',
      modalityId: String(prefill.modalityId ?? filterModalityId ?? ''),
      date: prefill.date ?? '',
      startTime: prefill.startTime ?? '',
      durationMin: '60',
      notes: '',
    })
    setBookingError('')
    setBookingFieldErrors({})
    setCompatibleStudios([])
    setBookingFromGrid(fromGrid)
    setBookingOpen(true)
  }, [filterModalityId])

  useEffect(() => {
    if (!bookingForm.modalityId) { setCompatibleStudios([]); return }
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
      setBookingError('Preencha todos os campos obrigatórios.')
      return
    }
    setBookingFieldErrors({})
    const startISO = combineDateTime(date, startTime)
    const endISO = combineDateTime(date, addMinutesToTime(startTime, Number(durationMin)))

    setBookingSaving(true)
    setBookingError('')
    try {
      await createBooking({
        teacherId: Number(teacherId),
        studioId: Number(studioId),
        modalityId: Number(modalityId),
        startTime: startISO,
        endTime: endISO,
        notes: notes || undefined,
      })
      setBookingOpen(false)
      await Promise.all([loadSlots(), loadHistory()])
    } catch (err) {
      setBookingError(err?.response?.data?.error || 'Não foi possível submeter a marcação.')
    } finally {
      setBookingSaving(false)
    }
  }, [bookingForm, loadSlots, loadHistory])

  // ── Cancel modal ───────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelJustification, setCancelJustification] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelSaving, setCancelSaving] = useState(false)

  const handleOpenCancel = useCallback((session) => {
    setCancelTarget(session)
    setCancelJustification('')
    setCancelError('')
    setCancelOpen(true)
  }, [])

  const handleCancelSubmit = useCallback(async () => {
    if (!cancelJustification.trim()) {
      setCancelError('A justificação é obrigatória (BR-17).')
      return
    }
    setCancelSaving(true)
    setCancelError('')
    try {
      await cancelBooking(cancelTarget.sessionId, cancelJustification)
      setCancelOpen(false)
      await Promise.all([loadSlots(), loadHistory()])
    } catch (err) {
      setCancelError(err?.response?.data?.error || 'Não foi possível cancelar a sessão.')
    } finally {
      setCancelSaving(false)
    }
  }, [cancelTarget, cancelJustification, loadSlots, loadHistory])

  // ── Confirm completion ─────────────────────────────────────────────
  const [confirmingId, setConfirmingId] = useState(null)

  const handleConfirmCompletion = useCallback(async (sessionId) => {
    setConfirmingId(sessionId)
    try {
      await confirmCompletion(sessionId)
      await loadHistory()
    } catch (err) {
      alert(err?.response?.data?.error || 'Não foi possível confirmar a sessão.')
    } finally {
      setConfirmingId(null)
    }
  }, [loadHistory])

  // ── Grid rendering ─────────────────────────────────────────────────
  const teachers = slotsData?.teachers ?? []
  const modalities = slotsData?.modalities ?? []
  const studios = slotsData?.studios ?? []
  const availabilityWindows = slotsData?.availabilityWindows ?? []

  // Build a map: date → teacherId → windows
  const windowMap = useMemo(() => {
    const map = new Map()
    for (const win of availabilityWindows) {
      const key = `${win.date}__${win.teacherId}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(win)
    }
    return map
  }, [availabilityWindows])

  // Visible days Mon-Fri (indices 0-4 = Mon-Fri in the weekDates array starting Mon)
  const visibleDates = weekDates.slice(0, 5)

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return ''
    const first = formatDatePT(visibleDates[0])
    const last = formatDatePT(visibleDates[4])
    return `${first} – ${last}`
  }, [visibleDates])

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
                  onClick={handleMobileNavClick}
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
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Coachings</h2>
                <p>Marcar, acompanhar, cancelar e validar sessões particulares</p>
              </div>
            </div>
            <div className="topbar-right" ref={notificationBoxRef} style={{ position: 'relative' }}>
              <button type="button" className="pill notifications-pill" onClick={handleNotificationsClick}
                style={{ cursor: 'pointer', border: '1px solid #f2c2af', borderRadius: '999px', background: '#fff3ee', color: '#8c402a', padding: '8px 12px', font: 'inherit', fontSize: '0.88rem' }}>
                Notificações
              </button>
              {notificationsOpen ? (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 'min(360px, 90vw)', border: '1px solid #e2d9eb', borderRadius: '14px', background: '#fff', boxShadow: '0 18px 36px rgba(20,14,30,0.22)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2d9eb' }}><strong>Notificações</strong></div>
                  {notificationsLoading ? <p style={{ margin: 0, padding: '12px', color: '#6d6480' }}>A carregar...</p> : null}
                  {!notificationsLoading && notificationsError ? <p style={{ margin: 0, padding: '12px', color: '#8b2e39' }}>{notificationsError}</p> : null}
                  {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                    <p style={{ margin: 0, padding: '12px', color: '#6d6480' }}>Sem notificações.</p>
                  ) : null}
                  {notifications.map((n) => (
                    <div key={n.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f0ebf6' }}>
                      <strong style={{ fontSize: '0.84rem' }}>{n.title}</strong>
                      {n.message ? <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6d6480' }}>{n.message}</p> : null}
                    </div>
                  ))}
                  <Link to="/student/notifications" style={{ display: 'block', padding: '10px 12px', fontSize: '0.84rem', color: '#6f5ca5', textDecoration: 'none', textAlign: 'center' }}
                    onClick={() => setNotificationsOpen(false)}>
                    Ver Mais
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <div className="content-grid">
            {/* ── Schedule grid panel ── */}
            <article className="panel">
              <h3>Mapa de horários</h3>

              <div className="filters-bar">
                <div className="week-nav">
                  <button type="button" className="week-nav-btn" onClick={() => setWeekOffset((w) => w - 1)}>‹</button>
                  <span className="week-label">{weekLabel}</span>
                  <button type="button" className="week-nav-btn" onClick={() => setWeekOffset((w) => w + 1)}>›</button>
                </div>

                <select
                  className="filter-select"
                  value={filterTeacherId}
                  onChange={(e) => setFilterTeacherId(e.target.value)}
                  aria-label="Filtrar por professor"
                >
                  <option value="">Todos os professores</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>{t.name}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={filterModalityId}
                  onChange={(e) => setFilterModalityId(e.target.value)}
                  aria-label="Filtrar por modalidade"
                >
                  <option value="">Todas as modalidades</option>
                  {modalities.map((m) => (
                    <option key={m.modalityId} value={m.modalityId}>{m.modalityName}</option>
                  ))}
                </select>

                <button type="button" className="cta" onClick={() => handleOpenBooking()}>
                  + Nova marcação
                </button>
              </div>

              <div className="legend-row">
                <span className="legend-item"><span className="legend-dot busy" />Ocupado / pendente</span>
                <span className="legend-item"><span className="legend-dot pending-teacher" />Aguarda professor</span>
                <span className="legend-item"><span className="legend-dot pending-direction" />Aguarda direção</span>
                <span className="legend-item"><span className="legend-dot free" />Disponível</span>
              </div>

              {slotsError ? (
                <div className="error-banner">
                  {slotsError}
                  <button type="button" className="ghost-btn" onClick={loadSlots}>Tentar novamente</button>
                </div>
              ) : null}

              {slotsLoading ? (
                <div>
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton-row" style={{ marginBottom: 8, height: 20 }} />)}
                </div>
              ) : (
                <div className="schedule-wrap">
                  <table className="schedule-grid">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Hora</th>
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
                      {teachers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-state">Nenhum professor disponível com os filtros selecionados.</td>
                        </tr>
                      ) : (
                        teachers.map((teacher) => (
                          <tr key={teacher.teacherId}>
                            <td className="time-col">{teacher.name}</td>
                            {visibleDates.map((date) => {
                              const key = `${date}__${teacher.teacherId}`
                              const windows = windowMap.get(key) ?? []

                              if (windows.length === 0) {
                                return (
                                  <td key={date}>
                                    <span className="slot-empty">—</span>
                                  </td>
                                )
                              }

                              return (
                                <td key={date} style={{ padding: '4px' }}>
                                  {windows.map((win, wi) => (
                                    <div key={wi} style={{ marginBottom: wi < windows.length - 1 ? 6 : 0 }}>
                                      <div className="legend-dot free" style={{ display: 'inline-block', marginRight: 4 }} />
                                      <small style={{ fontSize: '0.75rem', color: '#6d6480' }}>
                                        {win.windowStart}–{win.windowEnd}
                                      </small>
                                      <div className="slot-actions" style={{ marginTop: 4 }}>
                                        <button
                                          type="button"
                                          className="slot-btn primary"
                                          onClick={() => handleOpenBooking({
                                            teacherId: teacher.teacherId,
                                            date,
                                            startTime: win.windowStart,
                                            modalityId: filterModalityId || (teacher.modalityIds?.[0] ?? ''),
                                          })}
                                        >
                                          Marcar
                                        </button>
                                      </div>

                                      {win.bookedSessions.map((bs) => {
                                        const slotCls = resolveSlotClass(bs.status)
                                        const startStr = new Date(bs.startTime).toISOString().slice(11, 16)
                                        const endStr = new Date(bs.endTime).toISOString().slice(11, 16)
                                        const hasSpots = bs.maxParticipants && bs.enrolledCount < bs.maxParticipants
                                        return (
                                          <div key={bs.sessionId} className={`slot ${slotCls}`} style={{ marginTop: 6 }}>
                                            <strong>#{bs.sessionId} · {startStr}–{endStr}</strong>
                                            <small>
                                              {bs.status}
                                              {bs.maxParticipants ? ` · ${bs.enrolledCount}/${bs.maxParticipants} inscritos` : ''}
                                            </small>
                                            {hasSpots ? (
                                              <div className="slot-actions">
                                                <span className="badge ok">Com vagas</span>
                                              </div>
                                            ) : null}
                                          </div>
                                        )
                                      })}
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
              )}
            </article>

            {/* ── Pending confirmation panel (BR-14 step 1) ── */}
            {toConfirm.length > 0 ? (
              <article className="panel" id="confirmacao">
                <h3>Sessões para confirmar conclusão</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Sessão</th>
                      <th>Professor</th>
                      <th>Data</th>
                      <th>Estúdio</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toConfirm.map((s) => (
                      <tr key={s.sessionId}>
                        <td>#{s.sessionId}</td>
                        <td>{s.teachers.map((t) => t.name).join(', ') || '—'}</td>
                        <td>{formatDateTimePT(s.startTime)}</td>
                        <td>{s.studioName || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="confirm-btn"
                            disabled={confirmingId === s.sessionId}
                            onClick={() => handleConfirmCompletion(s.sessionId)}
                          >
                            {confirmingId === s.sessionId ? 'A confirmar…' : 'Confirmar execução'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ) : null}

            {/* ── Upcoming cancellable sessions ── */}
            {upcomingRows.length > 0 ? (
              <article className="panel">
                <h3>Próximas sessões</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Sessão</th>
                      <th>Data</th>
                      <th>Professor</th>
                      <th>Estúdio</th>
                      <th>Estado</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRows.map((s) => {
                      const badge = resolveStatusBadge(s.status)
                      return (
                        <tr key={s.sessionId}>
                          <td>#{s.sessionId}</td>
                          <td>{formatDateTimePT(s.startTime)}</td>
                          <td>{s.teachers.map((t) => t.name).join(', ') || '—'}</td>
                          <td>{s.studioName || '—'}</td>
                          <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                          <td>
                            <button
                              type="button"
                              className="slot-btn danger"
                              onClick={() => handleOpenCancel(s)}
                            >
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </article>
            ) : null}

            {/* ── Session history ── */}
            <article className="panel">
              <h3>Meu histórico de participação</h3>

              {sessionsError ? (
                <div className="error-banner">
                  {sessionsError}
                  <button type="button" className="ghost-btn" onClick={loadHistory}>Tentar novamente</button>
                </div>
              ) : null}

              {sessionsLoading ? (
                <div>
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton-row" />)}
                </div>
              ) : historyRows.length === 0 ? (
                <p className="empty-state">Sem histórico de sessões para mostrar.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Sessão</th>
                      <th>Professor</th>
                      <th>Modalidade</th>
                      <th>Estado</th>
                      <th>Valor final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((s) => {
                      const badge = resolveStatusBadge(s.status)
                      return (
                        <tr key={s.sessionId}>
                          <td>{formatDateTimePT(s.startTime)}</td>
                          <td>#{s.sessionId}</td>
                          <td>{s.teachers.map((t) => t.name).join(', ') || '—'}</td>
                          <td>{s.modalityName || '—'}</td>
                          <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                          <td>{formatMoney(s.finalPrice)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </article>
          </div>
        </main>
      </div>

      {/* ── Booking modal ── */}
      <Modal
        open={bookingOpen}
        title="Nova marcação de coaching"
        size="lg"
        className="coaching-modal"
        onClose={() => setBookingOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setBookingOpen(false)}>Cancelar</Button>
            <Button variant="cta" disabled={bookingSaving} onClick={handleBookingSubmit}>
              {bookingSaving ? 'A submeter…' : 'Submeter pedido'}
            </Button>
          </div>
        }
      >
        <BookingModalBody
          bookingForm={bookingForm}
          setBookingForm={setBookingForm}
          teachers={teachers}
          modalities={modalities}
          compatibleStudios={compatibleStudios}
          studiosLoading={studiosLoading}
          bookingError={bookingError}
          bookingFieldErrors={bookingFieldErrors}
          bookingFromGrid={bookingFromGrid}
        />
      </Modal>

      {/* ── Cancel modal (BR-17: justification required) ── */}
      <Modal
        open={cancelOpen}
        title="Cancelar sessão com justificação"
        size="sm"
        className="coaching-modal"
        onClose={() => setCancelOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="danger" disabled={cancelSaving} onClick={handleCancelSubmit}>
              {cancelSaving ? 'A cancelar…' : 'Confirmar cancelamento'}
            </Button>
          </div>
        }
      >
        <div className="bk-form">
          {cancelError ? <div className="bk-error">{cancelError}</div> : null}
          {cancelTarget ? (
            <div className="bk-info">
              Sessão #{cancelTarget.sessionId} · {formatDateTimePT(cancelTarget.startTime)} · {cancelTarget.studioName || '—'}
            </div>
          ) : null}
          <label>
            <span>Justificação do cancelamento <span className="bk-req">*</span></span>
            <textarea
              rows={4}
              value={cancelJustification}
              placeholder="Descreva o motivo do cancelamento (obrigatório)"
              onChange={(e) => setCancelJustification(e.target.value)}
              autoFocus
            />
          </label>
          <p style={{ fontSize: '0.8rem', color: '#6d6480', margin: 0 }}>
            A justificação será registada e comunicada ao professor (BR-17).
          </p>
        </div>
      </Modal>
    </div>
  )
}
