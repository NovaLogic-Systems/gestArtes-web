import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import TeacherCalendar from '../../components/teacher/TeacherCalendar.jsx'
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import { fetchTeacherAvailability, submitTeacherAvailability } from '../../services/teacherAvailability'
import UnavailabilityModal from '../../components/teacher/UnavailabilityModal'
import './AdmissionRequestsPage.css'
import './ScheduleSubmissionPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Disponibilidade', href: '/teacher/availability' },
  { label: 'Pedidos de admissão', href: '/teacher/admission-requests' },
  { label: 'Confirmação de sessões', href: '/teacher/sessions/confirmation' },
  { label: 'Marketplace', href: '/teacher/marketplace' },
  { label: 'Minha Conta', href: '/teacher/account' },
]

function formatNotificationDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const now = new Date()
  const diffMs = now - parsed
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' }).format(parsed)
}

export default function ScheduleSubmissionPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const [slots, setSlots] = useState([])
  const [proposed, setProposed] = useState(new Set())
  const [availabilityMode, setAvailabilityMode] = useState('weekly')
  const [academicYearId, setAcademicYearId] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSlot, setModalSlot] = useState(null)
  const [_loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const notificationCloseTimerRef = useRef(null)
  const notificationBoxRef = useRef(null)

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((v) => !v)
      return
    }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile])

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTeacherAvailability()
      const rawSlots = data?.availability || []
      const mappedSlots = []

      for (const item of rawSlots) {
        if (item.mode === 'weekly' && item.slot) {
          const day = item.slot.dayOfWeek === 0 ? 6 : item.slot.dayOfWeek - 1
          const hourParts = item.slot.startTime.split(':')
          const hour = parseInt(hourParts[0], 10)
          const minute = parseInt(hourParts[1], 10)
          mappedSlots.push({ day, hour, minute, status: item.status?.toLowerCase() })
        } else if (item.mode === 'semester' && item.slot) {
          const date = new Date(item.slot.startDateTime)
          const jsDay = date.getDay()
          const day = jsDay === 0 ? 6 : jsDay - 1
          const hour = date.getHours()
          const minute = date.getMinutes()
          mappedSlots.push({ day, hour, minute, status: item.status?.toLowerCase() })
        }
      }
      setSlots(mappedSlots)
    } catch {
      setError('Não foi possível carregar o calendário')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
      .then((preview) => setNotificationUnreadCount(preview.unreadCount))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return
    const onClick = (e) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notificationsOpen])

  const loadNotifications = useCallback(async () => {
    if (notificationsLoaded || notificationsLoading) return
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items)
      setNotificationsLoaded(true)
      setNotificationUnreadCount(preview.unreadCount)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [notificationsLoaded, notificationsLoading])

  const openNotificationsOnHover = useCallback(() => {
    if (notificationCloseTimerRef.current) {
      window.clearTimeout(notificationCloseTimerRef.current)
      notificationCloseTimerRef.current = null
    }
    setNotificationsOpen(true)
    if (!notificationsLoaded) {
      loadNotifications()
    }
  }, [loadNotifications, notificationsLoaded])

  const closeNotificationsOnHover = useCallback(() => {
    if (notificationCloseTimerRef.current) {
      window.clearTimeout(notificationCloseTimerRef.current)
    }
    notificationCloseTimerRef.current = window.setTimeout(() => {
      setNotificationsOpen(false)
      notificationCloseTimerRef.current = null
    }, 120)
  }, [])

  const handleNotificationsToggle = useCallback(() => {
    setNotificationsOpen((v) => {
      if (!v) loadNotifications()
      return !v
    })
  }, [loadNotifications])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const toggleSlot = useCallback(({ day, hour, minute }) => {
    const key = `${day}:${hour}:${minute}`
    setProposed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleRequestException = useCallback((day, hour, minute, slot) => {
    setModalSlot({ day, hour, minute, slot })
    setModalOpen(true)
  }, [])

  const submitException = async ({ reason, slotData }) => {
    setSaving(true)
    try {
      // Create punctual exception request
      const dayOfWeek = slotData.day === 6 ? 0 : slotData.day + 1
      const date = new Date()
      date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7) || 7)
      
      const startDateTime = new Date(date)
      startDateTime.setHours(slotData.hour, slotData.minute, 0, 0)
      
      const endDateTime = new Date(date)
      endDateTime.setHours(slotData.hour, slotData.minute + 30, 0, 0)

      await submitTeacherAvailability({ 
        slots: [{
          mode: 'semester',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString()
        }],
        notes: reason
      })

      setToast({ variant: 'success', title: 'Pedido enviado', description: 'O pedido de indisponibilidade foi submetido.' })
      setModalOpen(false)
      await load()
    } catch {
      setError('Erro ao enviar pedido de indisponibilidade.')
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    if (!proposed.size) return
    setSaving(true)
    setError('')
    try {
      const payloadSlots = Array.from(proposed).map((s) => {
        const [dayIdx, hour, minute] = s.split(':').map(Number)
        const dayOfWeek = dayIdx === 6 ? 0 : dayIdx + 1
        
        let endH = hour
        let endM = minute + 30
        if (endM >= 60) {
          endH += 1
          endM -= 60
        }

        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

        if (availabilityMode === 'weekly') {
          return {
            mode: 'weekly',
            dayOfWeek,
            startTime,
            endTime,
            academicYearId: Number(academicYearId),
            isActive: true
          }
        } else {
          const date = new Date()
          date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7) || 7)
          
          const startDateTime = new Date(date)
          startDateTime.setHours(hour, minute, 0, 0)
          
          const endDateTime = new Date(date)
          endDateTime.setHours(endH, endM, 0, 0)

          return {
            mode: 'semester',
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
          }
        }
      })

      await submitTeacherAvailability({ slots: payloadSlots })
      setToast({ variant: 'success', title: 'Sucesso', description: 'Disponibilidade submetida com sucesso.' })
      setProposed(new Set())
      await load()
    } catch {
      setError('Erro ao submeter a disponibilidade')
    } finally {
      setSaving(false)
    }
  }

  const sidebarToggleSymbol = isMobile
    ? (mobileOpen ? '✕' : '☰')
    : (sidebarCollapsed ? '▶' : '◀')

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
            <span className="brand-dot" aria-hidden="true" />
            <div>
              <h1>gestArtes</h1>
              <p>Professor</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={['nav-link', location.pathname === item.href ? 'active' : ''].filter(Boolean).join(' ')}
                onClick={handleMobileNavClick}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="sidebar-footer">
            <span className="sidebar-user">{displayName}</span>
            <button type="button" className="nav-link logout-link" onClick={handleLogout}>
              Terminar sessão
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="menu-toggle"
                aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Disponibilidade Interativa</h2>
                <p>Selecione blocos pontuais e recorrência: dias úteis das 18:00 às 21:30 e sábado das 09:00 às 13:00.</p>
              </div>
            </div>
            <div className="topbar-right" ref={notificationBoxRef} style={{ position: 'relative' }}>
              <span className="pill" id="availabilitySummary">{proposed.size} slots selecionados</span>
              <div
                className="notifications-hover-area"
                onMouseEnter={openNotificationsOnHover}
                onMouseLeave={closeNotificationsOnHover}
              >
                <NotificationsBell
                  onClick={handleNotificationsToggle}
                  count={notificationUnreadCount}
                  onMouseEnter={openNotificationsOnHover}
                />

                {notificationsOpen && (
                  <div className="notif-dropdown" role="dialog" aria-label="Painel de notificações" onMouseEnter={openNotificationsOnHover} onMouseLeave={closeNotificationsOnHover}>
                    <div className="notif-dropdown-header">
                      <div className="notifications-popover-sub">Últimas notificações</div>
                      <button type="button" className="icon-btn" onClick={() => setNotificationsOpen(false)} aria-label="Fechar notificações">✕</button>
                    </div>
                    <div className="notif-dropdown-body">
                      {notificationsLoading && <p className="notif-empty">A carregar…</p>}
                      {notificationsError && <p className="notif-empty notif-error">{notificationsError}</p>}
                      {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                        <p className="notif-empty">Ainda não tens notificações.</p>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className={['notif-item', n.isRead ? '' : 'notif-item--unread'].filter(Boolean).join(' ')}>
                          <p className="notif-title">{n.title}</p>
                          {n.message && <p className="notif-message">{n.message}</p>}
                          <p className="notif-date">{formatNotificationDate(n.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <div className="availability-toolbar">
                <label>Tipo de disponibilidade
                  <select value={availabilityMode} onChange={(e) => setAvailabilityMode(e.target.value)}>
                    <option value="semester">Pontual (apenas esta semana)</option>
                    <option value="weekly">Recorrente (todo o semestre)</option>
                  </select>
                </label>
                <label>Semestre
                  <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                    <option value="1">2025/2026 - 2.º semestre</option>
                    <option value="2">2026/2027 - 1.º semestre</option>
                  </select>
                </label>
              </div>

              {error && <p className="submission-error">{error}</p>}

              <div className="schedule-board">
                <TeacherCalendar slots={slots} proposed={proposed} onToggle={toggleSlot} onRequestException={handleRequestException} />
              </div>

              <div className="quick-actions" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  className="cta"
                  type="button"
                  onClick={submit}
                  disabled={!proposed.size || saving}
                >
                  {saving ? 'A submeter...' : 'Submeter disponibilidade'}
                </button>
                <button
                  className="cta secondary"
                  type="button"
                  onClick={() => setProposed(new Set())}
                >
                  Limpar seleção
                </button>
              </div>
            </article>
          </section>
        </main>

        <UnavailabilityModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSubmit={submitException}
          slotData={modalSlot}
        />
        {toast && (
          <Toast
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            onClose={() => setToast(null)}
            style={{ position: 'fixed', bottom: '18px', right: '18px', zIndex: 60 }}
          />
        )}
      </div>
    </div>
  )
}
