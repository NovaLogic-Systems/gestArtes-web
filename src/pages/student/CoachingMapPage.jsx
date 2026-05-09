/**
 * @file src/pages/student/CoachingMapPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 *
 * Mapa semanal de sessões de coaching — vista expandida para o aluno.
 * Filtros persistidos em localStorage. Segue o padrão CSS do CoachingPage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getAvailableSlots } from '../../services/coaching'
import notificationPreviewService from '../../services/notificationPreviewService'
import './coaching.css'

const STORAGE_KEY = 'coaching_map_filters'

const NAV_ITEMS = [
  { href: '/student/dashboard', label: 'Painel' },
  { href: '/student/coaching', label: 'Coaching' },
  { href: '/student/coaching/map', label: 'Mapa de Coaching' },
  { href: '/student/inventory', label: 'Inventário da Escola' },
  { href: '/student/inventory/rentals', label: 'As Minhas Rendas' },
  { href: '/student/marketplace', label: 'Marketplace' },
  { href: '/student/marketplace/my-listings', label: 'Os Meus Anúncios' },
  { href: '/student/lostfound', label: 'Perdidos e Achados' },
  { href: '/student/notifications', label: 'Notificações' },
  { href: '/student/account', label: 'Minha Conta' },
]

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

function resolveSlotClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('pending') || s.includes('reject')) return 'busy'
  if (s.includes('confirm') || s.includes('active')) return 'pending-direction'
  return 'free'
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

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const notificationBoxRef = useRef(null)
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

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const handler = (e) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(e.target))
        setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationsOpen])

  const handleNotificationsClick = async () => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && !notificationsLoaded) {
      setNotificationsLoading(true)
      try {
        const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
        setNotifications(preview.items)
        setUnreadCount(preview.unreadCount)
        setNotificationsLoaded(true)
      } finally { setNotificationsLoading(false) }
    }
  }

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

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return ''
    return `${formatDatePT(visibleDates[0])} – ${formatDatePT(visibleDates[5])}`
  }, [visibleDates])

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
          <div className="topbar-right" ref={notificationBoxRef}>
            <Link className="slot-btn primary" to="/student/coaching" style={{ textDecoration: 'none', padding: '7px 14px' }}>← Voltar</Link>
            <button type="button" className="slot-btn" onClick={handleNotificationsClick} style={{ padding: '7px 14px' }}>
              Notificações{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
            {notificationsOpen ? (
              <div style={{
                position: 'absolute', top: '60px', right: '12px', zIndex: 200,
                background: 'var(--coaching-panel-bg, #fff)', border: '1px solid var(--coaching-border, #e5e7eb)',
                borderRadius: '14px', padding: '14px', minWidth: '260px', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
              }}>
                <strong style={{ display: 'block', marginBottom: '8px' }}>Notificações</strong>
                {notificationsLoading ? <p style={{ margin: 0, opacity: 0.6 }}>A carregar...</p> : null}
                {!notificationsLoading && notifications.length === 0 ? <p style={{ margin: 0, opacity: 0.6 }}>Sem notificações.</p> : null}
                {notifications.map((n) => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--coaching-border, #e5e7eb)' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{n.title}</strong>
                    {n.message ? <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>{n.message}</p> : null}
                  </div>
                ))}
                <Link to="/student/notifications" style={{ display: 'block', marginTop: '8px', fontSize: '0.85rem', color: 'var(--coaching-accent, #7c3aed)' }} onClick={() => setNotificationsOpen(false)}>Ver todas</Link>
              </div>
            ) : null}
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
                                          return (
                                            <div key={sess.sessionId} className={`slot ${cls}`}>
                                              <strong style={{ fontSize: '0.8rem' }}>#{sess.sessionId} · {startH}{endH ? `–${endH}` : ''}</strong>
                                              {modName ? <small style={{ display: 'block' }}>{modName}</small> : null}
                                              <small style={{ display: 'block', color: spotsLeft > 0 ? '#059669' : '#dc2626' }}>
                                                {sess.enrolledCount}/{sess.maxParticipants} inscritos{spotsLeft > 0 ? ` · ${spotsLeft} vaga${spotsLeft !== 1 ? 's' : ''}` : ''}
                                              </small>
                                              {spotsLeft > 0 && cls !== 'busy' ? (
                                                <div className="slot-actions">
                                                  <button
                                                    type="button"
                                                    className="slot-btn primary"
                                                    onClick={() => { setJoiningSession({ ...sess, teacherName: teacherName(win.teacherId), modalityName: modName }); setJoinError(''); setJoinSuccess('') }}
                                                  >
                                                    Marcar
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>
                                          )
                                        })
                                      ) : (
                                        <div className="slot free">
                                          <small style={{ display: 'block' }}>Com vaga</small>
                                          <div className="slot-actions">
                                            <button
                                              type="button"
                                              className="slot-btn primary"
                                              onClick={() => { setJoiningSession({ teacherName: teacherName(win.teacherId), windowStart: win.windowStart, windowEnd: win.windowEnd }); setJoinError(''); setJoinSuccess('') }}
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
                  const { default: api } = await import('../../services/api')
                  await api.post('/coaching/bookings', { sessionId: joiningSession.sessionId })
                  setJoinSuccess('Pedido enviado!'); setJoiningSession(null); void loadMap()
                } catch (err) { setJoinError(err?.response?.data?.message || 'Erro ao enviar pedido.') }
                finally { setJoinLoading(false) }
              }}>
                {joinLoading ? 'A enviar...' : 'Confirmar adesão'}
              </button>
              <button type="button" className="slot-btn" onClick={() => setJoiningSession(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default CoachingMapPage
