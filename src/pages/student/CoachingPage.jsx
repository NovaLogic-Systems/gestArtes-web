/**
 * @file src/pages/student/CoachingPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import UnavailabilityModal from '../../components/teacher/UnavailabilityModal'
import JoinSessionButton from '../../components/JoinSessionButton'
import { fetchAbsenceDetails } from '../../services/teacherAvailability'
import api from '../../services/api'
import {
  createBooking,
  getAvailableSlots,
  getCompatibleStudios,
} from '../../services/coaching'
import './coaching.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const BOOKING_DURATIONS = [30, 45, 60, 90, 120]
const MIN_BOOKING_MINUTES = BOOKING_DURATIONS[0]

function getTodayISO() {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10)
}

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

function resolveStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('cancel')) return { label: 'Cancelada', cls: 'danger' }
  if (s.includes('reject')) return { label: 'Rejeitada', cls: 'danger' }
  if (s.includes('no_show') || s.includes('noshow') || s.includes('falta')) return { label: 'Falta s/ aviso', cls: 'danger' }
  if (s.includes('complet') || s.includes('final')) return { label: 'Finalizada', cls: 'ok' }
  if (s.includes('teacher') || s.includes('professor')) return { label: 'Aguarda professor', cls: 'warn' }
  if (s.includes('admin') || s.includes('direct') || s.includes('manag')) {
    return { label: 'Aguarda direção', cls: 'info' }
  }
  if (s.includes('pend')) return { label: 'Aguarda aprovação', cls: 'warn' }
  if (s.includes('valid')) return { label: 'A validar', cls: 'warn' }
  if (s.includes('approv') || s.includes('schedul') || s.includes('agend')) {
    return { label: 'Agendada', cls: 'ok' }
  }
  if (s.includes('active') || s.includes('ativa')) return { label: 'Ativa', cls: 'ok' }
  return { label: status || '—', cls: 'info' }
}

function resolveSlotClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('cancel') || s.includes('reject')) return 'busy'
  if (s.includes('teacher') || s.includes('professor')) return 'pending-teacher'
  if (s.includes('admin') || s.includes('direct') || s.includes('manag') || s.includes('pend')) return 'pending-direction'
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

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null
  const [h, m] = String(timeStr).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function computeWindowItems(win) {
  const items = []
  const sortedBookings = [...(win.bookedSessions || [])]
    .filter((bs) => {
      const bsStart = new Date(bs.startTime).toISOString().slice(11, 16)
      return bsStart >= win.windowStart && bsStart < win.windowEnd
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  let cursor = win.windowStart

  for (const bs of sortedBookings) {
    const bsStart = new Date(bs.startTime).toISOString().slice(11, 16)
    const bsEnd = new Date(bs.endTime).toISOString().slice(11, 16)
    if (bsStart > cursor) {
      items.push({ kind: 'free', start: cursor, end: bsStart })
    }
    items.push({ kind: 'booked', bs, start: bsStart, end: bsEnd })
    if (bsEnd > cursor) cursor = bsEnd
  }
  if (cursor < win.windowEnd) {
    items.push({ kind: 'free', start: cursor, end: win.windowEnd })
  }
  return items
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
  teacherWindows,
}) {
  const selectedTeacher = teachers.find((t) => String(t.teacherId) === bookingForm.teacherId)
  const selectedModality = modalities.find((m) => String(m.modalityId) === bookingForm.modalityId)
  const selectedStudio = compatibleStudios.find((s) => String(s.studioId) === bookingForm.studioId)
  const endTime = bookingForm.startTime
    ? addMinutesToTime(bookingForm.startTime, Number(bookingForm.durationMin))
    : null

  const startMin = timeToMinutes(bookingForm.startTime)
  const endMin = endTime ? timeToMinutes(endTime) : null
  const fitsWindow = teacherWindows.length > 0 && startMin != null && endMin != null
    ? teacherWindows.some((w) => {
        const ws = timeToMinutes(w.windowStart)
        const we = timeToMinutes(w.windowEnd)
        return ws != null && we != null && startMin >= ws && endMin <= we
      })
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

      {selectedTeacher && bookingForm.date && teacherWindows.length === 0 ? (
        <div className="bk-warning" role="alert">
          <strong>{selectedTeacher.name}</strong> não tem disponibilidade aprovada em {formatDatePT(bookingForm.date)}.
          Escolha outro dia ou outro professor.
        </div>
      ) : null}

      {selectedTeacher && bookingForm.date && teacherWindows.length > 0 ? (
        <div className="bk-availability-hint">
          <strong>Disponibilidade de {selectedTeacher.name} em {formatDatePT(bookingForm.date)}:</strong>{' '}
          {teacherWindows.map((w, i) => (
            <span key={i} className="bk-window-chip">{w.windowStart}–{w.windowEnd}</span>
          ))}
        </div>
      ) : null}

      {fitsWindow === false ? (
        <div className="bk-warning" role="alert">
          O intervalo escolhido ({bookingForm.startTime}–{endTime}) está fora da disponibilidade aprovada do professor.
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
              <option value="30">30 minutos</option>
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

      {/* Section: Formato */}
      <div className="bk-section">
        <p className="bk-section-title">Formato</p>
        <div className="bk-format-row">
          {[
            { key: 'individual', label: 'Individual', sub: '1 aluno', cap: 1 },
            { key: 'duo', label: 'Duo', sub: '2 alunos', cap: 2 },
            { key: 'group', label: 'Grupo', sub: '3+ alunos', cap: 3 },
          ].map((opt) => {
            const isSelected = bookingForm.format === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                className={`bk-format-card${isSelected ? ' selected' : ''}`}
                onClick={() => setBookingForm((f) => ({
                  ...f,
                  format: opt.key,
                  maxParticipants: opt.key === 'group' ? String(Math.max(Number(f.maxParticipants) || 3, 3)) : String(opt.cap),
                }))}
              >
                <strong>{opt.label}</strong>
                <small>{opt.sub}</small>
              </button>
            )
          })}
        </div>
        {bookingForm.format === 'group' ? (
          <label className={err.maxParticipants ? 'err' : ''}>
            <span>Número de alunos <span className="bk-req">*</span></span>
            <input
              type="number"
              min={3}
              max={selectedStudio?.capacity ?? 40}
              value={bookingForm.maxParticipants}
              onChange={(e) => setBookingForm((f) => ({ ...f, maxParticipants: e.target.value }))}
            />
            {selectedStudio ? (
              <small className="bk-hint">Máx. {selectedStudio.capacity} (capacidade do estúdio)</small>
            ) : null}
            {err.maxParticipants ? <span className="err-msg">Indique um número entre 3 e a capacidade do estúdio</span> : null}
          </label>
        ) : null}
        <p className="bk-hint" style={{ margin: 0 }}>
          Formato Duo ou Grupo permite que outros alunos peçam adesão à mesma sessão.
        </p>
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
              <span className="bk-summary-item">
                <strong>Formato</strong>
                {bookingForm.format === 'individual' ? 'Individual (1 aluno)'
                  : bookingForm.format === 'duo' ? 'Duo (2 alunos)'
                  : `Grupo (${bookingForm.maxParticipants || '?'} alunos)`}
              </span>
            </div>
            <p className="bk-summary-note">
              O pedido será submetido para validação pela direção antes de ser confirmado.
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

  // ── Week grid state ────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => getWeekMondayISO(weekOffset), [weekOffset])
  const weekDates = useMemo(() => buildWeekDates(weekStart), [weekStart])

  const [slotsData, setSlotsData] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotsError, setSlotsError] = useState('')
  const [myJoinRequests, setMyJoinRequests] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  // Filters - now used for client-side filtering only (no re-fetch)
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [filterModalityId, setFilterModalityId] = useState('')
  const searchTerm = ''

  const loadMyJoinRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/coaching/join-requests/my')
      setMyJoinRequests(Array.isArray(data) ? data : [])
    } catch {
      setMyJoinRequests([])
    }
  }, [])

  useEffect(() => { void loadMyJoinRequests() }, [loadMyJoinRequests])

  const myJoinRequestBySession = useMemo(() => {
    const map = new Map()
    for (const r of myJoinRequests) {
      if (r?.sessionId != null) map.set(Number(r.sessionId), r.status)
    }
    return map
  }, [myJoinRequests])

  // Load slots once per week (no re-fetch on filter change - filters are client-side now)
  const loadSlots = useCallback(async () => {
    setSlotsLoading(true)
    setSlotsError('')
    try {
      const data = await getAvailableSlots({
        weekStart,
      })
      setSlotsData(data)
    } catch (err) {
      setSlotsError(err?.response?.data?.error || 'Não foi possível carregar os horários.')
    } finally {
      setSlotsLoading(false)
    }
  }, [weekStart])

  useEffect(() => { void loadSlots() }, [loadSlots])

  // ── Booking modal ──────────────────────────────────────────────────
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    teacherId: '',
    studioId: '',
    modalityId: '',
    date: getTodayISO(),
    startTime: '',
    durationMin: '60',
    format: 'individual',
    maxParticipants: '1',
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
      date: prefill.date ?? getTodayISO(),
      startTime: prefill.startTime ?? '',
      durationMin: prefill.durationMin ?? '60',
      format: 'individual',
      maxParticipants: '1',
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
    const { teacherId, studioId, modalityId, date, startTime, durationMin, format, maxParticipants, notes } = bookingForm
    const fieldErrors = {}
    if (!teacherId) fieldErrors.teacherId = true
    if (!modalityId) fieldErrors.modalityId = true
    if (!studioId) fieldErrors.studioId = true
    if (!date) fieldErrors.date = true
    if (!startTime) fieldErrors.startTime = true
    const parsedMax = Number(maxParticipants)
    if (format === 'group' && (!Number.isInteger(parsedMax) || parsedMax < 3)) {
      fieldErrors.maxParticipants = true
    }
    if (Object.keys(fieldErrors).length > 0) {
      setBookingFieldErrors(fieldErrors)
      setBookingError('Preencha todos os campos obrigatórios.')
      return
    }
    setBookingFieldErrors({})

    const startDate = new Date(`${date}T${startTime}:00`)
    if (startDate.getTime() <= Date.now()) {
      setBookingError('Não é possível marcar para uma hora que já passou.')
      return
    }

    const teacherWindows = (slotsData?.availabilityWindows ?? []).filter(
      (w) => w.date === date && Number(w.teacherId) === Number(teacherId)
    )
    const endStr = addMinutesToTime(startTime, Number(durationMin))
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    const fits = teacherWindows.some((w) => {
      const [wsh, wsm] = w.windowStart.split(':').map(Number)
      const [weh, wem] = w.windowEnd.split(':').map(Number)
      return startMin >= wsh * 60 + wsm && endMin <= weh * 60 + wem
    })
    if (!fits) {
      setBookingError(
        teacherWindows.length === 0
          ? 'O professor selecionado não tem disponibilidade aprovada neste dia.'
          : 'O horário escolhido está fora da disponibilidade aprovada do professor.'
      )
      return
    }

    const startISO = combineDateTime(date, startTime)
    const endISO = combineDateTime(date, endStr)

    setBookingSaving(true)
    setBookingError('')
    try {
      const resolvedMax = format === 'individual' ? 1 : format === 'duo' ? 2 : parsedMax
      await createBooking({
        teacherId: Number(teacherId),
        studioId: Number(studioId),
        modalityId: Number(modalityId),
        startTime: startISO,
        endTime: endISO,
        maxParticipants: resolvedMax,
        notes: notes || undefined,
      })
      setBookingOpen(false)
      await loadSlots()
    } catch (err) {
      setBookingError(err?.response?.data?.error || 'Não foi possível submeter a marcação.')
    } finally {
      setBookingSaving(false)
    }
  }, [bookingForm, loadSlots, slotsData])

  // ── Teacher unavailability modal (mounted under schedule map)
  const [unavailOpen, setUnavailOpen] = useState(false)
  const [unavailSlot, setUnavailSlot] = useState(null)

  // ── Grid rendering ─────────────────────────────────────────────────
  const teachers = useMemo(() => slotsData?.teachers ?? [], [slotsData?.teachers])
  const modalities = useMemo(() => slotsData?.modalities ?? [], [slotsData?.modalities])

  // Client-side filtering: teacher + modality + search term
  const filteredTeachers = useMemo(() => {
    let result = teachers

    // Filter by teacher ID
    if (filterTeacherId) {
      result = result.filter((t) => String(t.teacherId) === String(filterTeacherId))
    }

    // Filter by modality: show teachers who have this modality
    if (filterModalityId) {
      result = result.filter((t) =>
        t.modalityIds?.includes(Number(filterModalityId))
      )
    }

    // Filter by search term (name)
    const term = normalizeText(searchTerm.trim())
    if (term) {
      result = result.filter((t) => normalizeText(t.name).includes(term))
    }

    return result
  }, [teachers, filterTeacherId, filterModalityId, searchTerm])

  // Build a map: date → teacherId → windows
  const windowMap = useMemo(() => {
    const map = new Map()
    for (const win of slotsData?.availabilityWindows ?? []) {
      const key = `${win.date}__${win.teacherId}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(win)
    }
    return map
  }, [slotsData?.availabilityWindows])

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
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/student/notifications" />
            </div>
          </header>

          <div className="content-grid">
            {/* ── Schedule grid panel ── */}
            <article className="panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Agendar sessão</h3>
                
              </div>

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
                        <th style={{ width: 130 }}>Professor</th>
                        {visibleDates.map((date) => {
                          const dow = new Date(date + 'T00:00:00Z').getUTCDay()
                          return (
                            <th key={date} style={{ minWidth: 160 }}>
                              {DAYS_SHORT[dow]}<br />
                              <span style={{ fontWeight: 400, fontSize: '0.76rem' }}>{formatDatePT(date)}</span>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-state">{searchTerm ? 'Nenhum professor encontrado.' : 'Nenhum professor disponível com os filtros selecionados.'}</td>
                        </tr>
                      ) : (
                        filteredTeachers.map((teacher) => (
                          <tr key={teacher.teacherId}>
                            <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', padding: '12px 10px', borderRight: '1px solid #e2d9eb', verticalAlign: 'top', whiteSpace: 'nowrap', backgroundColor: '#fdf9ff' }}>{teacher.name}</td>
                            {visibleDates.map((date) => {
                              const key = `${date}__${teacher.teacherId}`
                              const windows = windowMap.get(key) ?? []

                              if (windows.length === 0) {
                                return (
                                  <td key={date} style={{ backgroundColor: '#fcfafc' }}>
                                    <span className="slot-empty" style={{ display: 'block', textAlign: 'center', opacity: 0.5 }}>—</span>
                                  </td>
                                )
                              }

                              return (
                                <td key={date} style={{ padding: '4px' }}>
                                  {windows.map((win, wi) => {
                                    const items = computeWindowItems(win)
                                    return (
                                    <div key={wi} style={{ marginBottom: wi < windows.length - 1 ? 6 : 0 }}>
                                      {items.map((item, ii) => {
                                        if (item.kind === 'free') {
                                          const segEndDate = new Date(`${date}T${item.end}:00`)
                                          const isPast = segEndDate.getTime() <= Date.now()
                                          const segLen = (timeToMinutes(item.end) || 0) - (timeToMinutes(item.start) || 0)
                                          const tooShort = segLen < MIN_BOOKING_MINUTES
                                          const bookable = !isPast && !tooShort
                                          const fittingDuration = BOOKING_DURATIONS.filter((d) => d <= segLen).slice(-1)[0]
                                          return (
                                            <div key={`free-${ii}`} className={`slot ${bookable ? 'free' : 'busy'}`} style={{ marginTop: ii > 0 ? 6 : 0, opacity: bookable ? 1 : 0.7 }}>
                                              <strong>{item.start}–{item.end}</strong>
                                              <small style={{ fontSize: '0.75rem' }}>
                                                {isPast ? 'Expirado' : (tooShort ? 'Janela curta' : 'Livre para marcação')}
                                              </small>
                                              {bookable ? (
                                                <div className="slot-actions" style={{ marginTop: 6 }}>
                                                  <button
                                                    type="button"
                                                    className="slot-btn primary"
                                                    style={{ width: '100%', padding: '6px' }}
                                                    onClick={() => handleOpenBooking({
                                                      teacherId: teacher.teacherId,
                                                      date,
                                                      startTime: item.start,
                                                      modalityId: filterModalityId || (teacher.modalityIds?.[0] ?? ''),
                                                      durationMin: String(fittingDuration),
                                                    })}
                                                  >
                                                    Marcar horário
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>
                                          )
                                        }
                                        const bs = item.bs
                                        const slotCls = resolveSlotClass(bs.status)
                                        const statusBadge = resolveStatusBadge(bs.status)
                                        const startStr = item.start
                                        const endStr = item.end
                                        const hasSpots = bs.maxParticipants && bs.enrolledCount < bs.maxParticipants
                                        return (
                                          <div key={bs.sessionId} className={`slot ${slotCls}`} style={{ marginTop: ii > 0 ? 6 : 0 }}>
                                            <strong>{startStr}–{endStr}</strong>
                                            {bs.modalityName ? (
                                              <small style={{ fontWeight: 600, color: '#4338ca' }}>{bs.modalityName}</small>
                                            ) : null}
                                            <small>{statusBadge.label}</small>
                                            <small>
                                              {bs.maxParticipants ? ` ${bs.enrolledCount}/${bs.maxParticipants} inscritos` : ''}
                                            </small>
                                            {hasSpots && bs.maxParticipants > 1 ? (
                                              <div style={{ marginTop: 6 }}>
                                                <JoinSessionButton
                                                  sessionId={bs.sessionId}
                                                  sessionStatus={bs.status}
                                                  sessionStartTime={bs.startTime}
                                                  sessionEndTime={bs.endTime}
                                                  currentParticipants={bs.enrolledCount}
                                                  maxParticipants={bs.maxParticipants}
                                                  userIsEnrolled={bs.userIsEnrolled}
                                                  initialRequestStatus={myJoinRequestBySession.get(Number(bs.sessionId)) ?? null}
                                                  onSuccess={(result) => {
                                                    void loadMyJoinRequests()
                                                    void loadSlots()
                                                    setToast(result?.alreadyExisted
                                                      ? { variant: 'info', title: 'Pedido já existente', description: 'Já tens um pedido de adesão pendente para esta sessão.' }
                                                      : { variant: 'success', title: 'Pedido de adesão enviado', description: 'O professor recebe o pedido e a direção valida a seguir.' })
                                                  }}
                                                  onError={(err) => {
                                                    const status = err?.response?.status
                                                    if (status !== 409) {
                                                      setToast({ variant: 'danger', title: 'Erro', description: err?.response?.data?.error || 'Não foi possível enviar o pedido.' })
                                                    }
                                                  }}
                                                />
                                              </div>
                                            ) : null}
                                            {slotCls === 'pending-teacher' ? (
                                              <div style={{ marginTop: 8 }}>
                                                <button type="button" className="slot-btn" onClick={async () => {
                                                  let details = null
                                                  try {
                                                    details = await fetchAbsenceDetails(teacher.teacherId, { start: bs.startTime })
                                                  } catch {
                                                    details = null
                                                  }
                                                  setUnavailSlot({ ...bs, teacherId: teacher.teacherId, details })
                                                  setUnavailOpen(true)
                                                }}>
                                                  Ver indisponibilidade
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
                                        )
                                      })}
                                    </div>
                                    )
                                  })}
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
          teacherWindows={bookingForm.teacherId && bookingForm.date
            ? (windowMap.get(`${bookingForm.date}__${Number(bookingForm.teacherId)}`) ?? [])
            : []}
        />
      </Modal>

      {/* ── Teacher unavailability modal (shared component) ── */}
      <UnavailabilityModal
        isOpen={unavailOpen}
        onClose={() => setUnavailOpen(false)}
        onSubmit={() => setUnavailOpen(false)}
        slotData={unavailSlot}
        viewOnly={true}
        details={unavailSlot?.details}
      />

      {toast ? (
        <div style={{ position: 'fixed', right: '1.5rem', bottom: '1.5rem', zIndex: 1000 }}>
          <Toast
            open
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}
    </div>
  )
}
