import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import { localizeApiError } from '../../utils/apiErrors'
import { dayLabel, formatMinutes, listTimetables, sortTimetableSlots } from '../../services/timetableService'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import './timetablePage.css'

const WEEK_DAYS = [1, 2, 3, 4, 5, 6]

function TimetableCard({ timetable, active, onSelect }) {
  const slots = useMemo(() => sortTimetableSlots(timetable?.Slots || timetable?.slots || []), [timetable])

  return (
    <button type="button" className={`timetable-card${active ? ' active' : ''}`} onClick={onSelect}>
      <div className="timetable-card-head">
        <strong>{timetable.Label}</strong>
        {timetable.IsActive ? <span className="timetable-pill">Ativo</span> : null}
      </div>
      <p>{slots.length} blocos horários</p>
      <div className="timetable-card-preview">
        {slots.slice(0, 4).map((slot) => (
          <span key={slot.SlotID} className="timetable-chip">
            {dayLabel(slot.DayOfWeek)} · {formatMinutes(slot.StartMinutes)}
          </span>
        ))}
      </div>
    </button>
  )
}

export default function TimetablePage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Aluno'
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timetables, setTimetables] = useState([])
  const [selectedTimetableId, setSelectedTimetableId] = useState(null)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')

  const handleSidebarToggle = () => {
    if (isMobile) setMobileOpen((value) => !value)
    else setSidebarCollapsed((value) => !value)
  }

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
    let cancelled = false
    setLoading(true)
    listTimetables()
      .then((data) => {
        if (cancelled) return
        const sorted = [...data].sort((a, b) => Number(Boolean(b.IsActive)) - Number(Boolean(a.IsActive)) || String(a.Label).localeCompare(String(b.Label), 'pt'))
        setTimetables(sorted)
        setSelectedTimetableId((current) => current || sorted.find((t) => t.IsActive)?.TimetableID || sorted[0]?.TimetableID || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(localizeApiError(err, 'Não foi possível carregar os horários.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const selectedTimetable = timetables.find((timetable) => Number(timetable.TimetableID) === Number(selectedTimetableId)) || null
  const timetableOptions = useMemo(() => timetables.map((timetable) => ({
    value: String(timetable.TimetableID),
    label: timetable.Label,
    isActive: Boolean(timetable.IsActive),
  })), [timetables])
  const selectedSlots = useMemo(() => sortTimetableSlots(selectedTimetable?.Slots || selectedTimetable?.slots || []), [selectedTimetable])
  const groupedSlots = useMemo(() => {
    return selectedSlots.reduce((acc, slot) => {
      const key = Number(slot.DayOfWeek)
      if (!acc[key]) acc[key] = []
      acc[key].push(slot)
      return acc
    }, {})
  }, [selectedSlots])

  const selectedModeLabel = selectedTimetable?.Label || 'Seleciona uma modalidade'

  return (
    <div className="student-timetable-page">
      <div className={appShellClassName}>
        {isMobile && mobileOpen ? (
          <button type="button" className="sidebar-overlay" aria-label="Fechar navegação lateral" onClick={() => setMobileOpen(false)} />
        ) : null}

        <aside className={sidebarClassName} id="sidebar">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{displayName}</p>
            </div>
          </div>

          <nav className="nav-group" aria-label="Navegação do aluno">
            <h2>Aluno</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href} onClick={() => isMobile && setMobileOpen(false)}>
                  {item.label}
                </Link>
              )
            })}
            <button className="nav-link" type="button" onClick={async () => { await logout(); navigate('/login?reason=logged-out', { replace: true }) }}>
              Terminar Sessão
            </button>
          </nav>
        </aside>

        <main className="main page-transition">
          <header className="topbar">
            <div className="topbar-left">
              <button type="button" className="sidebar-toggle-btn" aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')} onClick={handleSidebarToggle}>
                {isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')}
              </button>
              <div>
                <h2>Horários</h2>
                <p>Consulta dos horários das modalidades de desporto</p>
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/student/notifications" />
            </div>
          </header>

          <section className="content-grid timetable-layout">
            <article className="panel timetable-main-panel timetable-main-panel-full">
              <div className="timetable-board">
                <div className="timetable-board-banner">
                  <div className="timetable-board-banner-copy">
                    <span className="timetable-board-kicker">Horários 2025/2026</span>
                    <h3>{selectedModeLabel.toUpperCase()}</h3>
                    <p>{selectedSlots.length} blocos distribuídos por dia da semana</p>
                  </div>
                  <div className="timetable-board-banner-select">
                    <label className="timetable-select-field" htmlFor="timetable-selector">
                      <span>Modalidade a visualizar</span>
                      <select
                        id="timetable-selector"
                        value={selectedTimetableId ? String(selectedTimetableId) : ''}
                        onChange={(event) => setSelectedTimetableId(Number(event.target.value))}
                        disabled={loading || timetableOptions.length === 0}
                      >
                        <option value="" disabled>Seleciona uma modalidade</option>
                        {timetableOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}{option.isActive ? ' · ativo' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="timetable-board-banner-badge">
                    {selectedTimetable?.IsActive ? <span className="timetable-pill">Modalidade ativa</span> : null}
                  </div>
                </div>

                {loading ? <p className="panel-subtle timetable-board-status">A carregar horários...</p> : null}
                {error ? <p className="error-banner timetable-board-status">{error}</p> : null}

                {selectedSlots.length === 0 ? (
                  <p className="empty-state">Não existem horários nesta modalidade.</p>
                ) : (
                  <div className="timetable-board-grid" role="table" aria-label={`Horário da modalidade ${selectedTimetable?.Label || ''}`}>
                    {WEEK_DAYS.map((day) => {
                      const daySlots = groupedSlots[day] || []
                      return (
                        <section key={day} className={`timetable-board-column${daySlots.length === 0 ? ' empty' : ''}`} role="rowgroup">
                          <div className="timetable-board-column-head" role="rowheader">{dayLabel(day)}</div>
                          <div className="timetable-board-column-body">
                            {daySlots.length === 0 ? (
                              <div className="timetable-slot-empty">Sem aulas</div>
                            ) : (
                              daySlots.map((slot) => (
                                <article
                                  key={slot.SlotID}
                                  className="timetable-slot-card timetable-slot-card-board"
                                  style={slot.Color ? { '--slot-accent': slot.Color } : undefined}
                                >
                                  <strong>{slot.Title}</strong>
                                  <p>{formatMinutes(slot.StartMinutes)} - {formatMinutes(slot.EndMinutes)}</p>
                                  {slot.Notes ? <small>{slot.Notes}</small> : null}
                                </article>
                              ))
                            )}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
