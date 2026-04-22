import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { KPICard } from '../../components/ui/KPICard'
import { Table } from '../../components/ui/Table'
import api from '../../services/api'
import AdminShell from './AdminShell'

const MODULES = ['finance', 'coaching', 'validations', 'marketplace', 'lostfound', 'users', 'system']

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
  { key: 'action', header: 'Ação' },
  { key: 'module', header: 'Módulo' },
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
  const [events, setEvents] = useState([])
  const [eventTotal, setEventTotal] = useState(0)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const buildParams = useCallback(
    (f = filters) => {
      const p = {}
      if (f.periodStart) p.periodStart = f.periodStart
      if (f.periodEnd) p.periodEnd = f.periodEnd
      if (f.module) p.module = f.module
      return p
    },
    [filters],
  )

  const loadAll = useCallback(
    async (f) => {
      setLoading(true)
      setError('')
      try {
        const params = buildParams(f)
        const [evRes, sumRes] = await Promise.all([
          api.get('/admin/audit', { params: { ...params, limit: 100, offset: 0 } }),
          api.get('/admin/audit/summary', { params }),
        ])
        setEvents(Array.isArray(evRes.data?.items) ? evRes.data.items : [])
        setEventTotal(evRes.data?.total ?? 0)
        setSummary(sumRes.data)
      } catch {
        setError('Não foi possível carregar os eventos de auditoria.')
      } finally {
        setLoading(false)
      }
    },
    [buildParams],
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFilterSubmit(e) {
    e.preventDefault()
    await loadAll(filters)
  }

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
                {m}
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
        />
      </section>
    </AdminShell>
  )
}
