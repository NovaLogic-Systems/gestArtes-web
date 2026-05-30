import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import Badge from '../../components/ui/Badge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import { useAuth } from '../../hooks/useAuth'
import { localizeApiError } from '../../utils/apiErrors'
import { dayLabel, formatMinutes, listTimetables, sortTimetableSlots } from '../../services/timetableService'
import { listCoachingModalities } from '../../services/coaching'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import './timetablePage.css'

const WEEK_DAYS = [1, 2, 3, 4, 5, 6]

function buildWeeklySlots(slots) {
  return WEEK_DAYS.map((day) => ({
    day,
    label: dayLabel(day),
    slots: slots.filter((slot) => Number(slot.DayOfWeek) === day),
  }))
}

function TimetableSection({ timetable, modalityFilter }) {
  const slots = useMemo(() => {
    const all = sortTimetableSlots(timetable?.Slots || timetable?.slots || [])
    if (!modalityFilter) return all
    return all.filter((slot) => slot.ModalityID != null && modalityFilter.has(Number(slot.ModalityID)))
  }, [timetable, modalityFilter])

  const weeklySlots = useMemo(() => buildWeeklySlots(slots), [slots])

  return (
    <article className="panel timetable-modality-panel">
      <div className="timetable-modality-head">
        <div>
          <h3>{timetable.Label}</h3>
          <p>
            {slots.length} bloco{slots.length === 1 ? '' : 's'}
          </p>
        </div>
        {timetable.IsActive ? <Badge variant="success" size="sm">Ativo</Badge> : <Badge variant="neutral" size="sm">Inativo</Badge>}
      </div>

      <div className="timetable-week-grid" role="list" aria-label={`Horário semanal da modalidade ${timetable.Label}`}>
        {weeklySlots.map((day) => (
          <section key={day.day} className={`timetable-day-column${day.slots.length === 0 ? ' empty' : ''}`}>
            <div className="timetable-day-column-head">
              <strong>{day.label}</strong>
              <span>{day.slots.length}</span>
            </div>

            {day.slots.length === 0 ? (
              <div className="timetable-slot-empty">Sem aulas</div>
            ) : (
              <div className="timetable-slot-list">
                {day.slots.map((slot) => (
                  <article
                    key={slot.SlotID}
                    className="timetable-slot-item"
                    style={slot.Color ? { '--slot-accent': slot.Color } : undefined}
                  >
                    <strong>{slot.Title}</strong>
                    <p>{formatMinutes(slot.StartMinutes)} - {formatMinutes(slot.EndMinutes)}</p>
                    {slot.Notes ? <small>{slot.Notes}</small> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}

function LoadingTimetableSection() {
  return (
    <article className="panel timetable-modality-panel timetable-modality-panel-loading" aria-hidden="true">
      <LoadingSkeleton lines={1} height="1rem" width="42%" />
      <LoadingSkeleton lines={1} height="0.85rem" width="22%" />
      <div className="timetable-week-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="timetable-day-column">
            <LoadingSkeleton lines={1} height="0.9rem" width="60%" />
            <LoadingSkeleton lines={3} height="3rem" width="100%" />
          </div>
        ))}
      </div>
    </article>
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
  const [reloadToken, setReloadToken] = useState(0)
  const [viewMode, setViewMode] = useState('all') // 'all' | 'mine'
  const [myModalityIds, setMyModalityIds] = useState(null) // Set<number> | null

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')

  const loadTimetables = useCallback(async (cancelledState = { cancelled: false }) => {
    setLoading(true)
    setError('')

    try {
      const data = await listTimetables()

      if (cancelledState.cancelled) return

      const sorted = [...data].sort(
        (a, b) =>
          Number(Boolean(b.IsActive)) - Number(Boolean(a.IsActive))
          || String(a.Label).localeCompare(String(b.Label), 'pt'),
      )

      setTimetables(sorted)
    } catch (err) {
      if (!cancelledState.cancelled) {
        setError(localizeApiError(err, 'Não foi possível carregar os horários.'))
      }
    } finally {
      if (!cancelledState.cancelled) {
        setLoading(false)
      }
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
    const cancelledState = { cancelled: false }
    void loadTimetables(cancelledState)

    return () => {
      cancelledState.cancelled = true
    }
  }, [loadTimetables, reloadToken])

  // Modalidades em que o aluno está inscrito (StudentAllowedModality, via /coaching/modalities).
  useEffect(() => {
    let cancelled = false
    listCoachingModalities()
      .then((data) => {
        if (!cancelled) setMyModalityIds(new Set((data || []).map((m) => Number(m.modalityId))))
      })
      .catch(() => {
        if (!cancelled) setMyModalityIds(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const modalityFilter = viewMode === 'mine' ? (myModalityIds || new Set()) : null

  const visibleTimetables = useMemo(() => {
    if (viewMode !== 'mine') return timetables
    const set = myModalityIds || new Set()
    return timetables.filter((timetable) =>
      (timetable.Slots || timetable.slots || []).some(
        (slot) => slot.ModalityID != null && set.has(Number(slot.ModalityID)),
      ),
    )
  }, [viewMode, timetables, myModalityIds])

  const timetableCount = visibleTimetables.length
  const activeCount = visibleTimetables.filter((timetable) => Boolean(timetable.IsActive)).length

  return (
    <div className="student-timetable-page">
      <a href="#main-content" className="skip-to-content">
        Ir para o conteúdo principal
      </a>

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

          <nav className="nav-group" aria-label="Navegação do aluno">
            <h2>Aluno</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  to={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => isMobile && setMobileOpen(false)}
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
          </nav>
        </aside>

        <main className="main page-transition">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={isMobile
                  ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
                  : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')}
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                onClick={() => (isMobile ? setMobileOpen((value) => !value) : setSidebarCollapsed((value) => !value))}
              >
                {isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')}
              </button>
              <div>
                <h2 id="main-content">Horários</h2>
                <p>Horário semanal organizado por modalidade</p>
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/student/notifications" />
            </div>
          </header>

          <section className="content-grid timetable-layout">
            <article className="panel timetable-intro-panel">
              <div>
                <h3>Horário semanal por modalidade</h3>
                <p>
                  {timetableCount} {timetableCount === 1 ? 'modalidade disponível' : 'modalidades disponíveis'}
                  {activeCount > 0 ? ` · ${activeCount} ${activeCount === 1 ? 'ativa' : 'ativas'}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'all'}
                  className={`timetable-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                  onClick={() => setViewMode('all')}
                >
                  Todos os horários
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'mine'}
                  className={`timetable-toggle-btn ${viewMode === 'mine' ? 'active' : ''}`}
                  onClick={() => setViewMode('mine')}
                >
                  As minhas modalidades
                </button>
                <button className="timetable-retry-btn" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                  Atualizar
                </button>
              </div>
            </article>

            {error ? (
              <div className="error-banner timetable-banner">
                <span>{error}</span>
                <button className="timetable-retry-btn" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                  Tentar novamente
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="timetable-section-stack">
                <LoadingTimetableSection />
                <LoadingTimetableSection />
              </div>
            ) : visibleTimetables.length === 0 ? (
              <div className="panel empty-state timetable-empty-state">
                {viewMode === 'mine'
                  ? 'Não há horários nas modalidades em que estás inscrito.'
                  : 'Não existem horários disponíveis para mostrar.'}
              </div>
            ) : (
              <div className="timetable-section-stack">
                {visibleTimetables.map((timetable) => (
                  <TimetableSection key={timetable.TimetableID} timetable={timetable} modalityFilter={modalityFilter} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
