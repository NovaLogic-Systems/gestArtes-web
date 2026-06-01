/**
 * @file src/pages/teacher/CreateCoachingPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 *
 * Formulário para o professor criar uma iniciativa de coaching (US-01).
 * POST /coaching/sessions | GET /studios/compatible?modalityId=
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import NotificationsBell from '../../components/NotificationsBell'
import '../admin-studios.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

function getTodayISO() {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10)
}

const buildEmptyForm = () => ({
  date: getTodayISO(),
  startTime: '',
  endTime: '',
  modalityId: '',
  studioId: '',
  capacity: '',
  pricePerHour: '',
  isExternal: false,
  isOutsideStdHours: false,
})

const inputStyle = {
  border: '1px solid #e2e4f0',
  borderRadius: '10px',
  padding: '10px 14px',
  background: '#f8f8fc',
  color: '#1a1a2e',
  font: 'inherit',
  fontSize: '0.925rem',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color .15s',
  outline: 'none',
}

const labelStyle = {
  display: 'grid',
  gap: '6px',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#555',
  letterSpacing: '0.01em',
}

function CreateCoachingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [form, setForm] = useState(buildEmptyForm())
  const [modalities, setModalities] = useState([])
  const [studios, setStudios] = useState([])
  const [loadingStudios, setLoadingStudios] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const displayName = user?.fullName || user?.name || user?.email || 'Professor'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellCls = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarCls = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')

  // Required for admin-studios.css scope
  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  // Load modalities on mount
  useEffect(() => {
    api.get('/modalities').then(({ data }) => {
      setModalities(Array.isArray(data) ? data : Array.isArray(data?.modalities) ? data.modalities : [])
    }).catch(() => { /* silently skip */ })
  }, [])

  // Load compatible studios when modality changes
  useEffect(() => {
    if (!form.modalityId) { setStudios([]); return }
    setLoadingStudios(true)
    api.get('/studios/compatible', { params: { modalityId: form.modalityId } })
      .then(({ data }) => setStudios(Array.isArray(data) ? data : Array.isArray(data?.studios) ? data.studios : []))
      .catch(() => setStudios([]))
      .finally(() => setLoadingStudios(false))
  }, [form.modalityId])

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

  const handleLogout = async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Pré-preenche a hora de fim (início + 60 min) quando ainda não foi definida.
  const addMinutesToTime = (time, minutes) => {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
    const total = h * 60 + m + minutes
    const hh = String(Math.floor((total % 1440) / 60)).padStart(2, '0')
    const mm = String(total % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value
    setForm((f) => ({
      ...f,
      startTime,
      endTime: f.endTime ? f.endTime : addMinutesToTime(startTime, 60),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.date || !form.startTime || !form.modalityId || !form.studioId || !form.capacity || !form.pricePerHour) {
      setError('Por favor preenche todos os campos obrigatórios.')
      return
    }

    const startISO = new Date(`${form.date}T${form.startTime}`).toISOString()
    const endISO = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : undefined

    setSubmitting(true)
    try {
      await api.post('/coaching/sessions', {
        date: form.date,
        startTime: startISO,
        ...(endISO ? { endTime: endISO } : {}),
        studioId: Number(form.studioId),
        modalityId: Number(form.modalityId),
        capacity: Number(form.capacity),
        pricePerHour: Number(form.pricePerHour),
        isExternal: form.isExternal,
        isOutsideStdHours: form.isOutsideStdHours,
      })
      setSuccess(true)
      setForm(buildEmptyForm())
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível criar a iniciativa. Verifica a tua disponibilidade e a do estúdio.')
    } finally {
      setSubmitting(false)
    }
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
          <h2>Professor</h2>
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
            <div className="topbar-heading">
              <button type="button" className="sidebar-toggle-btn" onClick={() => isMobile ? setMobileOpen((v) => !v) : setSidebarCollapsed((v) => !v)}>
                {toggleSymbol}
              </button>
              <h2>Criar Iniciativa de Coaching</h2>
            </div>
            <p>Define data, estúdio, capacidade e preço — a direção tem 48h para validar</p>
          </div>
          <div className="topbar-right">
            <NotificationsBell pageLink="/teacher/notifications" />
          </div>
        </header>

        <section className="content-grid">
          {success ? (
            <article className="panel">
              <div style={{ textAlign: 'center', padding: '32px 16px', display: 'grid', gap: '14px' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <h3 style={{ margin: 0, color: 'var(--studio-cta-text)' }}>Iniciativa submetida com sucesso!</h3>
                <p style={{ margin: 0, color: 'var(--studio-muted)' }}>
                  A tua iniciativa foi enviada e está a aguardar aprovação da gestão. Tens um prazo de 48h para receber resposta.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button type="button" className="cta" onClick={() => setSuccess(false)}>Criar outra iniciativa</button>
                  <Link to="/teacher/coaching" className="ghost-btn" style={{ textDecoration: 'none' }}>Voltar ao coaching</Link>
                </div>
              </div>
            </article>
          ) : (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3 style={{ margin: 0 }}>Nova iniciativa de coaching</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888' }}>Preenche os detalhes abaixo — a direção tem 48h para aprovar</p>
                </div>
              </div>

              {error ? <div className="soft-box error" role="alert" style={{ marginBottom: '16px' }}>{error}</div> : null}

              <form onSubmit={handleSubmit}>

                {/* Section: Quando */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>📅</div>
                    <strong style={{ fontSize: '0.95rem', color: '#1a1a2e' }}>Quando</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <label style={labelStyle}>
                      Data *
                      <input type="date" value={form.date} onChange={set('date')} required style={inputStyle} />
                    </label>
                    <label style={labelStyle}>
                      Hora de início *
                      <input type="time" value={form.startTime} onChange={handleStartTimeChange} required style={inputStyle} step="1800" />
                    </label>
                    <label style={labelStyle}>
                      Hora de fim
                      <input type="time" value={form.endTime} onChange={set('endTime')} style={inputStyle} step="1800" />
                    </label>
                    <small style={{ gridColumn: '3', fontWeight: 400, color: '#aaa', fontSize: '0.78rem', marginTop: '-8px', alignSelf: 'start' }}>Opcional — assume 60 min se vazio</small>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f0ebf6', margin: '0 0 24px' }} />

                {/* Section: O quê */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🎭</div>
                    <strong style={{ fontSize: '0.95rem', color: '#1a1a2e' }}>Modalidade e estúdio</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <label style={labelStyle}>
                      Modalidade *
                      <select value={form.modalityId} onChange={set('modalityId')} required style={inputStyle}>
                        <option value="">Selecionar modalidade</option>
                        {modalities.map((m) => (
                          <option key={m.ModalityID ?? m.id} value={m.ModalityID ?? m.id}>{m.ModalityName ?? m.name}</option>
                        ))}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Estúdio *
                      <select value={form.studioId} onChange={set('studioId')} required style={inputStyle} disabled={!form.modalityId || loadingStudios}>
                        <option value="">{loadingStudios ? 'A carregar...' : form.modalityId ? 'Selecionar estúdio' : 'Escolhe primeiro a modalidade'}</option>
                        {studios.map((s) => (
                          <option key={s.StudioID ?? s.id} value={s.StudioID ?? s.id}>{s.StudioName ?? s.name}</option>
                        ))}
                      </select>
                      {form.modalityId && studios.length === 0 && !loadingStudios ? (
                        <small style={{ fontWeight: 400, color: '#dc2626', fontSize: '0.8rem' }}>Sem estúdios compatíveis com esta modalidade.</small>
                      ) : null}
                    </label>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f0ebf6', margin: '0 0 24px' }} />

                {/* Section: Configurações */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#f43f5e,#be123c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⚙️</div>
                    <strong style={{ fontSize: '0.95rem', color: '#1a1a2e' }}>Configurações</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    <label style={labelStyle}>
                      Capacidade (nº de alunos) *
                      <input type="number" min="1" max="20" value={form.capacity} onChange={set('capacity')} required style={inputStyle} placeholder="Ex.: 3" />
                    </label>
                    <label style={labelStyle}>
                      Preço por hora (€) *
                      <input type="number" min="0" step="0.01" value={form.pricePerHour} onChange={set('pricePerHour')} required style={inputStyle} placeholder="Ex.: 25.00" />
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', border: '1px solid #e2e4f0', borderRadius: '10px', background: form.isExternal ? '#f0fdf4' : '#fff', flex: '1 1 200px', transition: 'background .2s' }}>
                      <input type="checkbox" checked={form.isExternal} onChange={set('isExternal')} style={{ accentColor: '#059669', width: '16px', height: '16px' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Sessão externa<br /><small style={{ fontWeight: 400, color: '#aaa' }}>Fora das instalações</small></span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', border: '1px solid #e2e4f0', borderRadius: '10px', background: form.isOutsideStdHours ? '#fefce8' : '#fff', flex: '1 1 200px', transition: 'background .2s' }}>
                      <input type="checkbox" checked={form.isOutsideStdHours} onChange={set('isOutsideStdHours')} style={{ accentColor: '#d97706', width: '16px', height: '16px' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Fora do horário padrão<br /><small style={{ fontWeight: 400, color: '#aaa' }}>Acréscimo tarifário aplicado</small></span>
                    </label>
                  </div>
                </div>

                {/* Info box */}
                <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>ℹ️</span>
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: '#3730a3' }}>Processo de aprovação</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#4338ca', lineHeight: 1.5 }}>
                      Após submissão, a iniciativa fica em estado <em>Pendente de Aprovação</em>. A direção tem um prazo de 48h para aprovar ou rejeitar. Receberás uma notificação com a decisão.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="cta" disabled={submitting}>
                    {submitting ? 'A submeter...' : 'Submeter iniciativa'}
                  </button>
                  <Link to="/teacher/coaching" className="ghost-btn" style={{ textDecoration: 'none' }}>Cancelar</Link>
                </div>
              </form>
            </article>
          )}
        </section>
      </main>
    </div>
  )
}

export default CreateCoachingPage
