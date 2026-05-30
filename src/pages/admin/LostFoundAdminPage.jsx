/**
 * @file src/pages/admin/LostFoundAdminPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import NotificationsBell from '../../components/NotificationsBell'
import '../admin-studios.css'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from './adminNav'

const selectStyle = {
  border: '1px solid var(--studio-field-line)', borderRadius: '10px', padding: '8px 10px',
  background: 'var(--studio-field-bg)', color: 'var(--studio-ink)', font: 'inherit',
}
const inputStyle = { ...selectStyle, width: '100%', boxSizing: 'border-box' }
const labelStyle = { display: 'grid', gap: '5px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--studio-label)' }

const EMPTY_FORM = { title: '', description: '', location: '', foundDate: '', claimedStatus: false, adminNotes: '' }

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

function LostFoundAdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterClaimed, setFilterClaimed] = useState('')
  const [filterArchived, setFilterArchived] = useState('active') // 'active' | 'archived' | 'all'
  const [filterLocation, setFilterLocation] = useState('')
  const [sortDir, setSortDir] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const displayName = user?.fullName || user?.name || user?.email || 'Administrador'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellCls = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarCls = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/lostfound')
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Não foi possível carregar os itens.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadItems() }, [loadItems])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const update = () => { setIsMobile(mq.matches); if (!mq.matches) setMobileOpen(false) }
    update()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update); return () => mq.removeEventListener('change', update)
    }
    mq.addListener(update); return () => mq.removeListener(update)
  }, [])

  const handleLogout = async (e) => {
    e.preventDefault(); try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const openCreate = () => { setEditingItem(null); setForm(EMPTY_FORM); setModalError(''); setModalOpen(true) }
  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      title: item.title ?? '',
      description: item.description ?? '',
      location: item.location ?? '',
      foundDate: (item.foundDate ?? '').slice(0, 10),
      claimedStatus: item.claimedStatus ?? false,
      adminNotes: item.adminNotes ?? '',
    })
    setModalError(''); setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setModalError('')
    if (!form.title || !form.foundDate) { setModalError('Preenche o título e a data.'); return }
    setSubmitting(true)
    try {
      if (editingItem) {
        await api.patch(`/admin/lostfound/${editingItem.id}`, form)
        setNotice('Item atualizado.')
      } else {
        await api.post('/admin/lostfound', form)
        setNotice('Item adicionado.')
      }
      setModalOpen(false); await loadItems()
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Erro ao guardar.')
    } finally { setSubmitting(false) }
  }

  const handleClaim = async (item) => {
    setNotice(''); setError('')
    try {
      await api.patch(`/admin/lostfound/${item.id}/claim`, { adminNotes: item.adminNotes || '' })
      setNotice('Item marcado como reclamado.'); await loadItems()
    } catch { setError('Não foi possível marcar como reclamado.') }
  }

  const handleArchive = async (item) => {
    setNotice(''); setError('')
    try {
      await api.patch(`/admin/lostfound/${item.id}/archive`, {})
      setNotice('Item arquivado.'); await loadItems()
    } catch { setError('Não foi possível arquivar.') }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Eliminar "${item.title}"?`)) return
    setNotice(''); setError('')
    try {
      await api.delete(`/admin/lostfound/${item.id}`)
      setNotice('Item eliminado.'); await loadItems()
    } catch { setError('Não foi possível eliminar.') }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const locationTerm = filterLocation.trim().toLowerCase()
    return items
      .filter((i) => filterArchived === 'all' ? true : filterArchived === 'archived' ? i.isArchived : !i.isArchived)
      .filter((i) => filterClaimed === '' ? true : filterClaimed === 'claimed' ? i.claimedStatus : !i.claimedStatus)
      .filter((i) => !locationTerm || (i.location && i.location.toLowerCase().includes(locationTerm)))
      .filter((i) => !term || [i.title, i.description, i.location, i.adminNotes]
        .filter(Boolean).join(' ').toLowerCase().includes(term))
      .sort((a, b) => {
        const da = new Date(a.foundDate || 0).getTime()
        const db = new Date(b.foundDate || 0).getTime()
        return sortDir === 'desc' ? db - da : da - db
      })
  }, [items, filterArchived, filterClaimed, filterLocation, searchTerm, sortDir])

  return (
    <div className={appShellCls}>
      {isMobile && mobileOpen ? <button type="button" className="sidebar-overlay" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={sidebarCls} id="sidebar">
        <div className="brand"><span className="brand-dot" /><div><h1>gestArtes</h1><p>{displayName}</p></div></div>
        <div className="nav-group">
          <h2>Gestão</h2>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} className={`nav-link${location.pathname === item.href ? ' active' : ''}`} to={item.href}>{item.label}</Link>
          ))}
          <a className="nav-link" href="/login" onClick={handleLogout}>Terminar Sessão</a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-heading">
              <button type="button" className="sidebar-toggle-btn" onClick={() => isMobile ? setMobileOpen((v) => !v) : setSidebarCollapsed((v) => !v)}>{toggleSymbol}</button>
              <h2>Perdidos e Achados</h2>
            </div>
            <input
              type="search"
              className="topbar-search"
              placeholder="Pesquisar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <button type="button" className="cta" onClick={openCreate}>+ Adicionar</button>
            <NotificationsBell pageLink="/admin/notifications" />
          </div>
        </header>

        <section className="content-grid">
          {notice ? <div className="soft-box" role="status">{notice}</div> : null}
          {error ? <div className="soft-box error" role="alert">{error}</div> : null}

          <article className="panel">
            <div className="panel-header">
              <h3>Itens registados{!loading ? ` · ${filtered.length}` : ''}</h3>
              <div className="card-actions">
                <select value={filterArchived} onChange={(e) => setFilterArchived(e.target.value)} style={selectStyle}>
                  <option value="active">Ativos</option>
                  <option value="archived">Arquivados</option>
                  <option value="all">Todos</option>
                </select>
                <select value={filterClaimed} onChange={(e) => setFilterClaimed(e.target.value)} style={selectStyle}>
                  <option value="">Todos</option>
                  <option value="unclaimed">Por reclamar</option>
                  <option value="claimed">Reclamados</option>
                </select>
                <input
                  type="text"
                  placeholder="Localização..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  style={{ ...selectStyle, minWidth: '140px' }}
                />
                <button type="button" className="ghost-btn" onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}>
                  Data {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="soft-box">A carregar...</div>
            ) : filtered.length === 0 ? (
              <div className="soft-box">Nenhum item encontrado.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Descrição</th>
                      <th>Localização</th>
                      <th>Data encontrada</th>
                      <th>Estado</th>
                      <th>Notas Admin</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.title}</strong></td>
                        <td style={{ minWidth: '180px', maxWidth: '320px', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {item.description || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td>{item.location || <span style={{ opacity: 0.4 }}>—</span>}</td>
                        <td>{formatDate(item.foundDate)}</td>
                        <td>
                          {item.isArchived
                            ? <span className="badge warn">Arquivado</span>
                            : item.claimedStatus
                              ? <span className="badge ok">Reclamado</span>
                              : <span className="badge warn">Por reclamar</span>}
                        </td>
                        <td style={{ minWidth: '160px', maxWidth: '240px', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {item.adminNotes || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button type="button" className="ghost-btn" onClick={() => openEdit(item)}>Editar</button>
                            {!item.claimedStatus && !item.isArchived
                              ? <button type="button" className="moderation-action-btn approve" onClick={() => handleClaim(item)}>Reclamado</button>
                              : null}
                            {!item.isArchived
                              ? <button type="button" className="moderation-action-btn reject" onClick={() => handleArchive(item)}>Arquivar</button>
                              : null}
                            <button type="button" className="danger-btn" onClick={() => handleDelete(item)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </main>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingItem ? 'Editar artigo' : 'Adicionar artigo'}</h3>
              <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>Fechar</button>
            </div>
            {modalError ? <div className="soft-box error" style={{ marginBottom: '12px' }}>{modalError}</div> : null}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={labelStyle}>
                Título *
                <input type="text" value={form.title} onChange={set('title')} required style={inputStyle} placeholder="Ex.: Mochila preta" />
              </label>
              <label style={labelStyle}>
                Data encontrada *
                <input type="date" value={form.foundDate} onChange={set('foundDate')} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Localização
                <input type="text" value={form.location} onChange={set('location')} style={inputStyle} placeholder="Ex.: Biblioteca, Refeitório..." />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                Descrição
                <input type="text" value={form.description} onChange={set('description')} style={inputStyle} placeholder="Cor, marca, características..." />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                Notas administrativas
                <textarea value={form.adminNotes} onChange={set('adminNotes')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Quem reclamou, data, etc." />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={form.claimedStatus} onChange={set('claimedStatus')} />
                Já reclamado
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                <button type="submit" className="cta" disabled={submitting}>{submitting ? 'A guardar...' : 'Guardar'}</button>
                <button type="button" className="ghost-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default LostFoundAdminPage
