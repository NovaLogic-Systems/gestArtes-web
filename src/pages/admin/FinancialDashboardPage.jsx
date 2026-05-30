/**
 * @file src/pages/admin/FinancialDashboardPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 *
 * Dashboard financeiro administrativo.
 * KPI cards, tabela de entradas, gráfico de receita mensal (recharts), exportação CSV.
 * Filtros: período, número de aluno.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import NotificationsBell from '../../components/NotificationsBell'
import '../admin-studios.css'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from './adminNav'

const ENTRY_TYPE_LABELS = {
  session_revenue: 'Taxa de coaching',
  no_show_fee: 'Penalização por falta sem aviso',
  cancellation_fee: 'Taxa de cancelamento',
  inventory_fee: 'Taxa de inventário',
  marketplace_fee: 'Taxa de marketplace',
}

const REVENUE_ENTRY_TYPES = ['session_revenue']
const PENALTY_ENTRY_TYPES = ['no_show_fee', 'cancellation_fee']

function resolveSessionStatusLabel(value) {
  if (!value) return null
  const norm = String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (norm.includes('finalized') || norm.includes('finalizad')) return { label: 'Finalizada', variant: 'ok' }
  if (norm.includes('noshow')) return { label: 'Falta sem aviso', variant: 'warn' }
  if (norm.includes('canceljustified') || norm.includes('cancelledjustified') || norm.includes('justified')) return { label: 'Cancelada (justificada)', variant: 'warn' }
  if (norm.includes('cancel')) return { label: 'Cancelada', variant: 'warn' }
  if (norm.includes('reject')) return { label: 'Rejeitada', variant: 'warn' }
  if (norm.includes('finalizationvalidationpending')) return { label: 'Aguarda validação', variant: 'warn' }
  if (norm.includes('completionconfirmationpending')) return { label: 'Aguarda confirmação', variant: 'warn' }
  if (norm.includes('pendingapproval') || norm === 'pending') return { label: 'Pendente', variant: 'warn' }
  if (norm.includes('approved') || norm.includes('scheduled')) return { label: 'Aprovada', variant: 'ok' }
  return { label: String(value), variant: 'warn' }
}

const selectStyle = {
  border: '1px solid var(--studio-field-line)', borderRadius: '10px', padding: '8px 10px',
  background: 'var(--studio-field-bg)', color: 'var(--studio-ink)', font: 'inherit',
}
const inputStyle = { ...selectStyle, width: '100%', boxSizing: 'border-box' }

/** Returns first day of current month as YYYY-MM-DD */
function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today() { return new Date().toISOString().slice(0, 10) }

function fmt(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

function KPICard({ label, value, sub, gradient, icon }) {
  return (
    <div style={{
      background: '#ffffff',
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      border: '1px solid #e2d9eb',
      borderRadius: '12px',
      padding: '12px',
      textAlign: 'left'
    }}>
      <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#4c4666', fontWeight: 600 }}>{label}</h3>
      <strong style={{ display: 'block', marginTop: '8px', fontSize: '1.7rem', color: '#08786d', fontWeight: 700 }}>{value}</strong>
      {sub ? <small style={{ display: 'block', marginTop: '4px', opacity: 0.75, fontSize: '0.8rem', color: '#6d6480' }}>{sub}</small> : null}
    </div>
  )
}

function FinancialDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Filters
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [studentNumber, setStudentNumber] = useState('')

  // Data
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [revenueChart, setRevenueChart] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const displayName = user?.fullName || user?.name || user?.email || 'Administrador'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellCls = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarCls = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        periodStart: from,
        periodEnd: to,
        ...(studentNumber.trim() ? { studentNumber: studentNumber.trim() } : {}),
      }
      const [txRes, sumRes, revRes] = await Promise.allSettled([
        api.get('/admin/finance/transactions', { params }),
        api.get('/admin/finance/summary', { params }),
        api.get('/admin/finance/revenue', { params: { periodStart: from, periodEnd: to } }),
      ])

      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data
        setTransactions(
          Array.isArray(data) ? data
            : Array.isArray(data?.items) ? data.items
            : Array.isArray(data?.transactions) ? data.transactions
            : []
        )
      }
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
      if (revRes.status === 'fulfilled') {
        const data = revRes.value.data
        setRevenueChart(
          Array.isArray(data) ? data
            : Array.isArray(data?.months) ? data.months
            : Array.isArray(data?.revenue) ? data.revenue
            : []
        )
      }
    } catch {
      setError('Não foi possível carregar os dados financeiros.')
    } finally {
      setLoading(false)
    }
  }, [from, to, studentNumber])

  // Debounce data loads to avoid excessive API calls when filters change rapidly
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadData()
    }, 500) // wait 500ms after filter change before fetching

    return () => clearTimeout(timeoutId)
  }, [loadData])

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
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  const handleLogout = async (e) => {
    e.preventDefault()
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  const handleExport = async () => {
    setExporting(true)
    setNotice('')
    setError('')
    try {
      const res = await api.post('/admin/finance/export', { periodStart: from, periodEnd: to, ...(studentNumber.trim() ? { studentNumber: studentNumber.trim() } : {}) }, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `gestArtes_finance_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setNotice('Exportação CSV concluída.')
    } catch {
      setError('Não foi possível exportar o ficheiro.')
    } finally {
      setExporting(false)
    }
  }

  const totalRevenue = summary?.totalRevenue ?? transactions.filter((t) => REVENUE_ENTRY_TYPES.includes(t.entryType ?? t.EntryType)).reduce((s, t) => s + (Number(t.amount ?? t.Amount) || 0), 0)
  const totalPenalties = summary?.totalPenalties ?? transactions.filter((t) => PENALTY_ENTRY_TYPES.includes(t.entryType ?? t.EntryType)).reduce((s, t) => s + (Number(t.amount ?? t.Amount) || 0), 0)
  const totalExported = summary?.exportedCount ?? transactions.filter((t) => t.isExported ?? t.IsExported).length
  const totalEntries = summary?.totalEntries ?? transactions.length

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
          <h2>Gestão</h2>
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
              <h2>Finanças e Relatórios</h2>
            </div>
          </div>
          <div className="topbar-right">
            <NotificationsBell pageLink="/admin/notifications" />
          </div>
        </header>

        <section className="content-grid">
          {notice ? <div className="soft-box" role="status">{notice}</div> : null}
          {error ? <div className="soft-box error" role="alert">{error}</div> : null}

          {/* Filters */}
          <article className="panel">
            <div className="panel-header">
              <h3>Filtros de período</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: '5px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--studio-label)' }}>
                Período — início
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: '5px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--studio-label)' }}>
                Período — fim
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: '5px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--studio-label)' }}>
                Nº de aluno (opcional)
                <input type="text" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="Ex.: 2026001" style={inputStyle} />
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="cta" disabled={loading} onClick={loadData}>
                  {loading ? 'A carregar...' : 'Gerar resumo'}
                </button>
                <button type="button" className="ghost-btn" disabled={exporting || transactions.length === 0} onClick={handleExport}>
                  {exporting ? 'A exportar...' : 'Exportar CSV'}
                </button>
              </div>
            </div>
          </article>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <KPICard
              label="Receita Total"
              value={`${Number(totalRevenue).toFixed(2)} €`}
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              icon="💶"
            />
            <KPICard
              label="Total Penalizações"
              value={`${Number(totalPenalties).toFixed(2)} €`}
              gradient="linear-gradient(135deg, #f43f5e 0%, #be123c 100%)"
              icon="⚠️"
            />
            <KPICard
              label="Entradas Exportadas"
              value={totalExported}
              sub="para contabilidade"
              gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
              icon="📤"
            />
            <KPICard
              label="Total de Entradas"
              value={totalEntries}
              gradient="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
              icon="📋"
            />
          </div>

          {/* Revenue chart */}
          {revenueChart.length > 0 ? (
            <article className="panel">
              <div className="panel-header"><h3>Receita por mês</h3></div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--studio-panel-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}€`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v} €`} />
                  <Legend />
                  <Bar dataKey="revenue" name="Receita (€)" fill="var(--studio-cta-start)" radius={[6, 6, 0, 0]} />
                  {revenueChart[0]?.penalties !== undefined ? (
                    <Bar dataKey="penalties" name="Penalizações (€)" fill="#e05c5c" radius={[6, 6, 0, 0]} />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </article>
          ) : null}

          {/* Transactions table */}
          <article className="panel">
            <div className="panel-header">
              <h3>Entradas financeiras{!loading ? ` · ${transactions.length}` : ''}</h3>
            </div>

            {loading ? (
              <div className="soft-box">A carregar entradas...</div>
            ) : transactions.length === 0 ? (
              <div className="soft-box">Sem entradas financeiras para o período selecionado.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Data</th>
                      <th>Aluno</th>
                      <th>Sessão</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Exportado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const id = t.id ?? t.EntryID
                      const exported = t.isExported ?? t.IsExported
                      const amount = Number(t.amount ?? t.Amount ?? 0)
                      const entryType = t.entryType ?? t.EntryType ?? ''
                      const rawStatus = t.sessionStatus ?? t.SessionStatus ?? t.status ?? t.Status ?? ''
                      const statusMeta = resolveSessionStatusLabel(rawStatus)
                      return (
                        <tr key={id}>
                          <td style={{ fontFamily: 'monospace', opacity: 0.7 }}>#{id}</td>
                          <td>{fmt(t.createdAt ?? t.CreatedAt)}</td>
                          <td>{t.studentName ?? t.StudentName ?? '—'}</td>
                          <td style={{ fontFamily: 'monospace', opacity: 0.7 }}>#{t.sessionId ?? t.SessionID ?? '—'}</td>
                          <td>{ENTRY_TYPE_LABELS[entryType] ?? entryType}</td>
                          <td><strong>{amount.toFixed(2)} €</strong></td>
                          <td>
                            {statusMeta ? (
                              <span className={`badge ${statusMeta.variant}`}>{statusMeta.label}</span>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`badge ${exported ? 'ok' : 'warn'}`}>
                              {exported ? '✓ Sim' : 'Não'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}

export default FinancialDashboardPage
