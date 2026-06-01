import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import TeacherCalendar from '../../components/teacher/TeacherCalendar.jsx'
import Toast from '../../components/ui/Toast'
import NotificationsBell from '../../components/NotificationsBell'
import { fetchTeacherAvailability, submitTeacherAvailability, reportTeacherAbsence } from '../../services/teacherAvailability'
import api from '../../services/api'
import UnavailabilityModal from '../../components/teacher/UnavailabilityModal'
import '../admin-studios.css'
import './AdmissionRequestsPage.css'
import './ScheduleSubmissionPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import { localizeApiError } from '../../utils/apiErrors'

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
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
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
          mappedSlots.push({ id: item.id, reason: item.notes, day, hour, minute, status: item.status?.toLowerCase() })
        } else if (item.mode === 'semester' && item.slot) {
          const date = new Date(item.slot.startDateTime)
          const jsDay = date.getDay()
          const day = jsDay === 0 ? 6 : jsDay - 1
          const hour = date.getHours()
          const minute = date.getMinutes()
          mappedSlots.push({ id: item.id, reason: item.notes, day, hour, minute, status: item.status?.toLowerCase() })
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
    setModalSlot({ day, hour, minute, slot, id: slot?.id, reason: slot?.reason })
    setModalOpen(true)
  }, [])

  const submitException = async ({ reason, slotData }) => {
    setSaving(true)
    setError('')
    try {
      let startDateTimeStr = slotData?.startDateTime;
      let endDateTimeStr = slotData?.endDateTime;

      if (!startDateTimeStr || !endDateTimeStr) {
        if (!slotData || slotData.day === undefined) {
          throw new Error('Dados de ausência em falta.')
        }
        const dayOfWeek = slotData.day === 6 ? 0 : slotData.day + 1
        const date = new Date()
        date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7) || 7)

        const startDateTime = new Date(date)
        startDateTime.setHours(slotData.hour, slotData.minute, 0, 0)

        const endDateTime = new Date(date)
        endDateTime.setHours(slotData.hour, slotData.minute + 30, 0, 0)

        startDateTimeStr = startDateTime.toISOString();
        endDateTimeStr = endDateTime.toISOString();
      }

      await reportTeacherAbsence({
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        reason,
      })

      setToast({ variant: 'success', title: 'Ausência reportada', description: 'O pedido de ausência foi submetido para validação.' })
      setModalOpen(false)
      await load()
    } catch (err) {
      const message = localizeApiError(err, 'Erro ao reportar ausência.')
      setError(message)
      setToast({ variant: 'danger', title: 'Erro', description: message })
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

  const cancelException = async (availabilityId) => {
    try {
      await api.delete(`/teacher/availability/${availabilityId}`)

      setToast({
        variant: 'success',
        title: 'Pedido cancelado',
        description: 'A sua disponibilidade foi revertida com sucesso.'
      })
      setModalOpen(false)
      load()
    } catch (err) {
      setToast({
        variant: 'danger',
        title: 'Erro ao cancelar',
        description: localizeApiError(err, 'Erro ao cancelar a ausência.')
      })
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
              <p>{displayName}</p>
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
            <button className="nav-link" type="button" onClick={handleLogout}>
              Terminar Sessão
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-heading">
                <button
                  type="button"
                  className="sidebar-toggle-btn"
                  aria-label={isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')}
                  aria-controls="sidebar"
                  aria-expanded={mobileOpen}
                  onClick={handleSidebarToggle}
                >
                  {sidebarToggleSymbol}
                </button>
                <h2>Disponibilidade Interativa</h2>
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/teacher/notifications" />
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

              <div className="calendar-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                  Clique num horário branco para selecionar ou num <strong>amarelo para retirar o pedido</strong>.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className="pill" id="availabilitySummary">{proposed.size} slots selecionados</span>
                  <div className="calendar-legend" style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '2px' }}></span> Selecionado
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '2px' }}></span> Pendente
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '2px' }}></span> Aprovado
                    </div>
                  </div>
                </div>
              </div>

              <div className="schedule-board">
                <TeacherCalendar slots={slots} proposed={proposed} onToggle={toggleSlot} onRequestException={handleRequestException} />
              </div>

              <div className="quick-actions" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="cta"
                  type="button"
                  onClick={submit}
                  disabled={!proposed.size || saving}
                >
                  {saving ? 'A submeter...' : 'Submeter'}
                </button>
                
                <button
                  className="cta secondary"
                  type="button"
                  onClick={() => {
                    setModalSlot(null);
                    setModalOpen(true);
                  }}
                >
                  Reportar Ausência
                </button>

                <button
                  className="cta secondary"
                  type="button"
                  onClick={() => setProposed(new Set())}
                  style={{ marginLeft: 'auto' }}
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
          onCancel={cancelException}
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



