import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import '../admin-studios.css'
import NotificationsBell from '../../components/NotificationsBell'
import './SessionConfirmationPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

const NO_SHOW_STATUSES = new Set(['no_show', 'noshow', 'no-show'])
const ATTENDANCE_CONFIRMED_STATUSES = new Set(['present', 'presente', 'confirmed', 'confirmado', 'attended'])

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed)
}

function formatTime(value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

function resolveAttendanceBadge(statusName) {
  const n = String(statusName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (NO_SHOW_STATUSES.has(n)) return { variant: 'danger', label: 'Falta s/ aviso' }
  if (ATTENDANCE_CONFIRMED_STATUSES.has(n)) return { variant: 'ok', label: 'Presente' }
  return { variant: 'neutral', label: 'Pendente' }
}

function isNoShow(statusName) {
  const n = String(statusName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return NO_SHOW_STATUSES.has(n)
}

function isPresent(statusName) {
  const n = String(statusName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return ATTENDANCE_CONFIRMED_STATUSES.has(n)
}

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function normalizeSessions(payload) {
  const items = Array.isArray(payload?.sessions) ? payload.sessions : []
  return items.map((s) => {
    const startDt = s.startTime ? new Date(s.startTime) : null
    const endDt = s.endTime ? new Date(s.endTime) : null
    const toHHMM = (dt) =>
      dt && !isNaN(dt.getTime())
        ? `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`
        : null
    return {
      sessionId: Number(s.sessionId),
      date: s.date || s.startTime || null,
      startTime: toHHMM(startDt) || s.startTime || null,
      endTime: toHHMM(endDt) || s.endTime || null,
      studioName: String(s.studioName || '—').trim(),
      modalityName: String(s.modalityName || '—').trim(),
      status: String(s.status || s.statusName || '—').trim(),
      students: Array.isArray(s.students) ? s.students.map((st) => ({
        studentAccountId: Number(st.studentAccountId),
        studentUserId: Number(st.studentUserId),
        studentName: String(st.studentName || 'Aluno').trim(),
        email: String(st.email || st.studentEmail || '').trim(),
        attendanceStatus: String(st.attendanceStatus || '').trim(),
      })) : [],
    }
  })
}

export default function SessionConfirmationPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState(() => {
    return new URLSearchParams(location.search).get('q') || ''
  })
  const [toast, setToast] = useState(null)

  const [noShowModal, setNoShowModal] = useState(null)
  const [noShowRemarks, setNoShowRemarks] = useState('')
  const [noShowRemarksError, setNoShowRemarksError] = useState('')
  const [noShowSubmitting, setNoShowSubmitting] = useState(false)

  const [confirmingSession, setConfirmingSession] = useState(null)

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

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/teacher/sessions/pending', {
        params: { view: 'confirmation' },
      })
      setSessions(normalizeSessions(data))
    } catch {
      setError('Não foi possível carregar as sessões. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleConfirmSession(sessionId) {
    setConfirmingSession(sessionId)
    try {
      await api.patch(`/teacher/sessions/${sessionId}/confirm-completion`)
      setToast({ variant: 'success', title: 'Sessão confirmada', description: 'Conclusão da sessão confirmada. A gestão será notificada.' })
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
    } catch (err) {
      const msg = err?.response?.data?.error || 'Não foi possível confirmar a sessão.'
      setToast({ variant: 'danger', title: 'Erro', description: msg })
    } finally {
      setConfirmingSession(null)
    }
  }

  function openNoShowModal(session, student) {
    setNoShowModal({ session, student })
    setNoShowRemarks('')
    setNoShowRemarksError('')
  }

  function closeNoShowModal() {
    if (noShowSubmitting) return
    setNoShowModal(null)
    setNoShowRemarks('')
    setNoShowRemarksError('')
  }

  async function handleRegisterNoShow() {
    if (!noShowModal) return
    const trimmedRemarks = noShowRemarks.trim()
    if (!trimmedRemarks) {
      setNoShowRemarksError('A observação é obrigatória para registar falta sem aviso.')
      return
    }
    setNoShowSubmitting(true)
    try {
      await api.post(`/teacher/sessions/${noShowModal.session.sessionId}/no-show`, {
        studentAccountId: noShowModal.student.studentAccountId,
        remarks: trimmedRemarks,
      })
      setToast({
        variant: 'success',
        title: 'Falta registada',
        description: `Falta sem aviso registada para ${noShowModal.student.studentName}. Penalização BR-16 aplicada.`,
      })
      setSessions((prev) =>
        prev.map((s) => {
          if (s.sessionId !== noShowModal.session.sessionId) return s
          return {
            ...s,
            students: s.students.map((st) =>
              st.studentAccountId === noShowModal.student.studentAccountId
                ? { ...st, attendanceStatus: 'NO_SHOW' }
                : st,
            ),
          }
        }),
      )
      setNoShowModal(null)
    } catch (err) {
      const msg = err?.response?.data?.error || 'Não foi possível registar a falta. Tenta novamente.'
      setNoShowRemarksError(msg)
    } finally {
      setNoShowSubmitting(false)
    }
  }

  const sidebarToggleSymbol = isMobile
    ? (mobileOpen ? '✕' : '☰')
    : (sidebarCollapsed ? '▶' : '◀')

  const filteredSessions = useMemo(() => {
    const term = normalizeText(searchTerm)
    if (!term) return sessions
    return sessions.filter((s) =>
      normalizeText([s.studioName, s.modalityName, s.date, String(s.sessionId)]
        .concat(s.students?.map((st) => st.studentName) ?? [])
        .join(' ')).includes(term)
    )
  }, [sessions, searchTerm])

  return (
    <div className="teacher-session-confirmation">
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
                <h2>Confirmação de sessões concluídas</h2>
              </div>
              <p>Valida a presença dos alunos e confirma apenas sessões que já terminaram</p>
            </div>
            <div className="topbar-right">
              <input
                type="search"
                className="topbar-search"
                placeholder="Pesquisar sessões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <NotificationsBell pageLink="/teacher/notifications" />
            </div>
          </header>

          <div className="page-content">
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button type="button" onClick={loadSessions} className="retry-btn">
                  Tentar novamente
                </button>
              </div>
            )}

            {loading ? (
              <div className="sessions-grid">
                {[1, 2].map((i) => (
                  <div key={i} className="panel">
                    <LoadingSkeleton />
                  </div>
                ))}
              </div>
            ) : filteredSessions.length === 0 && !error ? (
              <div className="panel empty-state">
                <p className="empty-state-icon" aria-hidden="true">✓</p>
                <h3>{searchTerm ? 'Nenhuma sessão encontrada.' : 'Sem sessões para confirmar'}</h3>
                <p>{searchTerm ? 'Tenta outro termo de pesquisa.' : 'Todas as sessões concluídas já foram confirmadas ou ainda não existem sessões terminadas.'}</p>
              </div>
            ) : (
              <div className="sessions-grid">
                {filteredSessions.map((session) => {
                  const allHandled = session.students.every(
                    (st) => isNoShow(st.attendanceStatus) || isPresent(st.attendanceStatus),
                  )
                  const isConfirming = confirmingSession === session.sessionId
                  const hasStudents = session.students.length > 0

                  return (
                    <article key={session.sessionId} className="panel session-card">
                      <div className="session-card-header">
                        <div className="session-card-meta">
                          <span className="session-ref">Sessão #{session.sessionId}</span>
                          <span className="session-detail">{formatDate(session.date)}</span>
                          <span className="session-detail">
                            {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </span>
                          <span className="session-detail">{session.studioName}</span>
                          <Badge variant="neutral">{session.modalityName}</Badge>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isConfirming || !hasStudents}
                          onClick={() => handleConfirmSession(session.sessionId)}
                          title={
                            !hasStudents
                              ? 'Sem alunos inscritos'
                              : allHandled
                                ? 'Confirmar conclusão da sessão'
                                : 'Confirmar conclusão (ainda há alunos por avaliar)'
                          }
                        >
                          {isConfirming ? 'A confirmar…' : 'Confirmar conclusão'}
                        </Button>
                      </div>

                      {!allHandled && hasStudents && (
                        <p className="session-hint" role="status">
                          {session.students.filter((st) => !isNoShow(st.attendanceStatus) && !isPresent(st.attendanceStatus)).length} aluno(s) por avaliar
                        </p>
                      )}

                      <div className="attendance-list">
                        <div className="attendance-list-header">
                          <span>Aluno</span>
                          <span>Estado</span>
                          <span className="attendance-actions-col">Ações</span>
                        </div>

                        {!hasStudents && (
                          <div className="attendance-row attendance-row--empty">
                            <span>Sem alunos inscritos nesta sessão.</span>
                          </div>
                        )}

                        {session.students.map((student) => {
                          const attendanceBadge = resolveAttendanceBadge(student.attendanceStatus)
                          const alreadyNoShow = isNoShow(student.attendanceStatus)
                          const alreadyPresent = isPresent(student.attendanceStatus)
                          const handled = alreadyNoShow || alreadyPresent

                          return (
                            <div
                              key={student.studentAccountId}
                              className={[
                                'attendance-row',
                                alreadyNoShow ? 'attendance-row--noshow' : '',
                                alreadyPresent ? 'attendance-row--present' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              <div className="attendance-student">
                                <span className="attendance-name">{student.studentName}</span>
                                {student.email && (
                                  <span className="attendance-email">{student.email}</span>
                                )}
                              </div>

                              <Badge variant={attendanceBadge.variant}>{attendanceBadge.label}</Badge>

                              <div className="attendance-actions">
                                {!handled && (
                                  <button
                                    type="button"
                                    className="attendance-btn attendance-btn--noshow"
                                    onClick={() => openNoShowModal(session, student)}
                                    aria-label={`Registar falta sem aviso para ${student.studentName}`}
                                  >
                                    Falta s/ aviso
                                  </button>
                                )}
                                {alreadyNoShow && (
                                  <span className="attendance-action-done attendance-action-done--noshow">
                                    Falta registada
                                  </span>
                                )}
                                {alreadyPresent && (
                                  <span className="attendance-action-done attendance-action-done--present">
                                    Presença confirmada
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        <Modal
          open={noShowModal !== null}
          onClose={closeNoShowModal}
          title={`Registar falta sem aviso — ${noShowModal?.student?.studentName || 'Aluno'}`}
          description="Esta ação regista a ausência sem aviso prévio e aplica a penalização financeira. Não pode ser desfeita."
          footer={
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={closeNoShowModal} disabled={noShowSubmitting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleRegisterNoShow} disabled={noShowSubmitting}>
                {noShowSubmitting ? 'A registar…' : 'Registar falta sem aviso'}
              </Button>
            </div>
          }
        >
          {noShowModal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>
                <strong>Sessão:</strong> #{noShowModal.session.sessionId} · {formatDate(noShowModal.session.date)} · {noShowModal.session.modalityName} · {noShowModal.session.studioName}
              </p>
              <p>
                <strong>Aluno:</strong> {noShowModal.student.studentName}
              </p>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span>Observação <span aria-hidden="true">*</span></span>
                <textarea
                  id="no-show-remarks"
                  rows={4}
                  value={noShowRemarks}
                  onChange={(e) => {
                    setNoShowRemarks(e.target.value)
                    if (noShowRemarksError) setNoShowRemarksError('')
                  }}
                  disabled={noShowSubmitting}
                  placeholder="Descreve a situação, tentativas de contacto, etc."
                  aria-describedby={noShowRemarksError ? 'no-show-remarks-error' : undefined}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: noShowRemarksError ? '1px solid #dc2626' : '1px solid var(--border)',
                    font: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </label>

              {noShowRemarksError && (
                <p id="no-show-remarks-error" style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }} role="alert">
                  {noShowRemarksError}
                </p>
              )}
            </div>
          )}
        </Modal>

        {toast && (
          <Toast
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}
