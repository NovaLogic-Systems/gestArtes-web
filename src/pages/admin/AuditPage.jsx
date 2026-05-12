import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { KPICard } from '../../components/ui/KPICard'
import { Table } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import api from '../../services/api'
import AdminShell from './AdminShell'

const MODULES = ['finance', 'coaching', 'validations', 'marketplace', 'lostfound', 'users', 'system']

const MODULE_LABELS = {
  finance: 'Finanças',
  coaching: 'Aulas/Sessões',
  validations: 'Validações',
  marketplace: 'Marketplace',
  lostfound: 'Perdidos e Achados',
  users: 'Utilizadores',
  system: 'Sistema',
}

const ACTION_LABELS = {
  FINANCE_EXPORT: 'Exportação Financeira',
  NOSHOW_PENALTY_APPLIED: 'Penalização No-Show',
  SESSION_FINALIZED: 'Sessão Finalizada',
  SESSION_CANCELLED: 'Sessão Cancelada',
  VALIDATION_APPROVED: 'Validação Aprovada',
  VALIDATION_REJECTED: 'Validação Rejeitada',
  LOSTFOUND_CLAIMED: 'Item Reclamado',
  LOSTFOUND_ARCHIVED: 'Item Arquivado',
  MARKETPLACE_HIDDEN: 'Item Ocultado',
  USER_PASSWORD_RESET: 'Reset de Password',
}

const INITIAL_FILTERS = {
  periodStart: '',
  periodEnd: '',
  module: '',
}

const TABLE_COLUMNS = [
  {
    key: 'timestamp',
    header: 'Data / Hora',
    render: (row) =>
      row.timestamp
        ? new Date(row.timestamp).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
        : '—',
  },
  { key: 'userName', header: 'Utilizador', render: (row) => row.userName || `#${row.userId ?? '?'}` },
  {
    key: 'action',
    header: 'Ação',
    render: (row) => ACTION_LABELS[row.action] || row.action,
  },
  {
    key: 'module',
    header: 'Módulo',
    render: (row) => MODULE_LABELS[row.module] || row.module,
  },
  {
    key: 'result',
    header: 'Resultado',
    render: (row) => (
      <Badge variant={row.result === 'success' ? 'success' : 'danger'} size="sm">
        {row.result === 'success' ? 'Sucesso' : 'Falha'}
      </Badge>
    ),
  },
  { key: 'detail', header: 'Detalhe', render: (row) => row.detail || '—' },
]

export default function AuditPage() {
  const location = useLocation()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [events, setEvents] = useState([])
  const [eventTotal, setEventTotal] = useState(0)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError('')
      const params = {}
      if (appliedFilters.periodStart) params.periodStart = appliedFilters.periodStart
      if (appliedFilters.periodEnd) params.periodEnd = appliedFilters.periodEnd
      if (appliedFilters.module) params.module = appliedFilters.module

      try {
        const [{ items, total }, sumRes] = await Promise.all([
          api.get('/admin/audit', {
            params: { ...params, limit: pageSize, offset: (currentPage - 1) * pageSize },
          }).then((response) => ({
            items: Array.isArray(response.data?.items) ? response.data.items : [],
            total: response.data?.total ?? 0,
          })),
          api.get('/admin/audit/summary', { params }),
        ])
        if (cancelled) return
        setEvents(items)
        setEventTotal(total)
        setSummary(sumRes.data)
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao carregar auditoria:', {
            message: err?.message,
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            data: err?.response?.data,
            url: err?.config?.url,
          })
          setError('Não foi possível carregar os eventos de auditoria.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [appliedFilters, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [appliedFilters.periodStart, appliedFilters.periodEnd, appliedFilters.module])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(eventTotal / pageSize))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, eventTotal])

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  function handleFilterSubmit(e) {
    e.preventDefault()
    setCurrentPage(1)
    setAppliedFilters(filters)
  }

  const totalPages = Math.max(1, Math.ceil(eventTotal / pageSize))
  const firstItem = eventTotal === 0 ? 0 : ((currentPage - 1) * pageSize) + 1
  const lastItem = Math.min(eventTotal, currentPage * pageSize)

  return (
    <AdminShell
      title="Auditoria"
      subtitle="Registo de ações críticas do sistema"
      activePath={location.pathname}
    >
      {error ? (
        <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>
      ) : null}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(4, 1fr)',
          marginBottom: '1.5rem',
        }}
      >
        <KPICard
          title="Ações (últ. 24h)"
          value={summary?.auditedActionsLast24h ?? 0}
          description="Eventos auditados recentes"
        />
        <KPICard
          title="Total no período"
          value={summary?.total ?? 0}
          description="Eventos no intervalo filtrado"
        />
        <KPICard
          title="Sucessos"
          value={summary?.byResult?.success ?? 0}
          description="Ações bem-sucedidas"
        />
        <KPICard
          title="Falhas"
          value={summary?.byResult?.failure ?? 0}
          description="Ações com erro"
        />
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilterSubmit}
        style={{
          alignItems: 'flex-end',
          background: 'var(--studio-panel, #fff)',
          border: '1px solid var(--studio-line, #e2d9eb)',
          borderRadius: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '1rem',
        }}
      >
        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Data início</span>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => handleFilterChange('periodStart', e.target.value)}
            style={{ borderRadius: '0.5rem', border: '1px solid var(--studio-line, #ccc)', padding: '0.45rem 0.65rem' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Data fim</span>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => handleFilterChange('periodEnd', e.target.value)}
            style={{ borderRadius: '0.5rem', border: '1px solid var(--studio-line, #ccc)', padding: '0.45rem 0.65rem' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Módulo</span>
          <select
            value={filters.module}
            onChange={(e) => handleFilterChange('module', e.target.value)}
            style={{ borderRadius: '0.5rem', border: '1px solid var(--studio-line, #ccc)', padding: '0.45rem 0.65rem' }}
          >
            <option value="">Todos</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABELS[m] || m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--studio-cta-start, #0b9d8f)',
            border: 0,
            borderRadius: '999px',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            font: 'inherit',
            fontWeight: 600,
            opacity: loading ? 0.7 : 1,
            padding: '0.5rem 1.1rem',
          }}
        >
          {loading ? 'A carregar…' : 'Filtrar'}
        </button>
      </form>

      {/* Events table */}
      <section>
        <h3 style={{ margin: '0 0 0.75rem' }}>
          Eventos de auditoria ({eventTotal})
        </h3>
        <Table
          columns={TABLE_COLUMNS}
          rows={events}
          getRowKey={(row, i) => `${row.timestamp}-${i}`}
          emptyState={loading ? 'A carregar…' : 'Sem eventos de auditoria para o período selecionado.'}
          headBackground="#f4f4f8"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted, #718096)', fontSize: '0.9rem' }}>
            {eventTotal === 0 ? 'Sem eventos para mostrar.' : `A mostrar ${firstItem}-${lastItem} de ${eventTotal}`}
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="Paginação da auditoria"
            style={{ marginTop: 0 }}
          />
        </div>
      </section>
    </AdminShell>
  )
}
