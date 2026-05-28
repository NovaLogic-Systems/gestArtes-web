import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import { localizeApiError } from '../../utils/apiErrors'
import { dayLabel, formatMinutes, listTimetables, sortTimetableSlots } from '../../services/timetableService'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import '../student/timetablePage.css'

export default function TeacherTimetablePage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'
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
  const selectedSlots = useMemo(() => sortTimetableSlots(selectedTimetable?.Slots || selectedTimetable?.slots || []), [selectedTimetable])
  const groupedSlots = useMemo(() => {
    return selectedSlots.reduce((acc, slot) => {
      const key = Number(slot.DayOfWeek)
      if (!acc[key]) acc[key] = []
      acc[key].push(slot)
      return acc
    }, {})
  }, [selectedSlots])

  return (
    <div className="teacher-timetable-page">
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

          <nav className="nav-group" aria-label="Navegação do professor">
            <h2>Professor</h2>
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
              <button type="button" className="sidebar-toggle-btn" aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')} onClick={() => (isMobile ? setMobileOpen((v) => !v) : setSidebarCollapsed((v) => !v))}>
                {isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')}
              </button>
              <div>
                <h2>Horários</h2>
                <p>Consulta dos mapas de horário disponíveis</p>
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/teacher/notifications" />
            </div>
          </header>

          <section className="content-grid timetable-layout">
            <article className="panel timetable-sidebar-panel">
              <h3>Mapas</h3>
              {loading ? <p className="panel-subtle">A carregar horários...</p> : null}
              {error ? <p className="error-banner">{error}</p> : null}
              <div className="timetable-list">
                {timetables.map((timetable) => (
                  <button
                    key={timetable.TimetableID}
                    type="button"
                    className={`timetable-card${Number(timetable.TimetableID) === Number(selectedTimetableId) ? ' active' : ''}`}
                    onClick={() => setSelectedTimetableId(timetable.TimetableID)}
                  >
                    <div className="timetable-card-head">
                      <strong>{timetable.Label}</strong>
                      {timetable.IsActive ? <span className="timetable-pill">Ativo</span> : null}
                    </div>
                    <p>{sortTimetableSlots(timetable?.Slots || timetable?.slots || []).length} blocos horários</p>
                  </button>
                ))}
              </div>
            </article>

            <article className="panel timetable-main-panel">
              <div className="timetable-main-head">
                <div>
                  <h3>{selectedTimetable?.Label || 'Seleciona um mapa'}</h3>
                  <p>{selectedSlots.length} blocos distribuídos por dia da semana</p>
                </div>
                {selectedTimetable?.IsActive ? <span className="timetable-pill">Mapa ativo</span> : null}
              </div>

              {selectedSlots.length === 0 ? (
                <p className="empty-state">Não existem horários neste mapa.</p>
              ) : (
                <div className="timetable-grid">
                  {Object.entries(groupedSlots)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, slots]) => (
                      <section key={day} className="timetable-day-card">
                        <h4>{dayLabel(day)}</h4>
                        {slots.map((slot) => (
                          <div key={slot.SlotID} className="timetable-slot-card">
                            <strong>{slot.Title}</strong>
                            <p>{formatMinutes(slot.StartMinutes)} - {formatMinutes(slot.EndMinutes)}</p>
                            {slot.Notes ? <small>{slot.Notes}</small> : null}
                          </div>
                        ))}
                      </section>
                    ))}
                </div>
              )}
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
