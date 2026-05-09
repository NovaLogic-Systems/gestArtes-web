import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '../../components/ui/Badge'
import { KPICard } from '../../components/ui/KPICard'
import { Table } from '../../components/ui/Table'
import api from '../../services/api'
import AdminShell from './AdminShell'

const INITIAL_FILTERS = {
  periodStart: '',
  periodEnd: '',
  studentNumber: '',
}

const ENTRY_TYPE_LABELS = {
  session_revenue: 'Receita de Sessão',
  no_show_fee: 'Taxa de No-Show',
  cancellation_fee: 'Taxa de Cancelamento',
  inventory_fee: 'Taxa de Inventário',
  marketplace_fee: 'Taxa de Marketplace',
}

const TABLE_COLUMNS = [
  { key: 'entryId', header: 'ID' },
  { key: 'sessionId', header: 'Sessão' },
  {
    key: 'entryType',
    header: 'Tipo',
    render: (row) => ENTRY_TYPE_LABELS[row.entryType] || row.entryType || '—',
  },
  {
    key: 'amount',
    header: 'Valor (€)',
    render: (row) => `${Number(row.amount).toFixed(2)} €`,
  },
  {
    key: 'createdAt',
    header: 'Data',
    render: (row) =>
      row.createdAt
        ? new Date(row.createdAt).toLocaleDateString('pt-PT')
        : '—',
  },
  { key: 'studentName', header: 'Aluno', render: (row) => row.studentName || '—' },
  {
    key: 'isExported',
    header: 'Exportado',
    render: (row) => (
      <Badge variant={row.isExported ? 'success' : 'neutral'} size="sm">
        {row.isExported ? 'Sim' : 'Não'}
      </Badge>
    ),
  },
]

function fmt(n) {
  return typeof n === 'number' ? n.toFixed(2) : '0.00'
}

export default function FinancialDashboardPage() {
  const location = useLocation()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transactionTotal, setTransactionTotal] = useState(0)
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError('')
      const params = {}
      if (appliedFilters.periodStart) params.periodStart = appliedFilters.periodStart
      if (appliedFilters.periodEnd) params.periodEnd = appliedFilters.periodEnd
      if (appliedFilters.studentNumber) params.studentNumber = appliedFilters.studentNumber

      try {
        const [sumRes, txRes, revRes] = await Promise.all([
          api.get('/admin/finance/summary', { params }),
          api.get('/admin/finance/transactions', { params: { ...params, limit: 50, offset: 0 } }),
          api.get('/admin/finance/revenue'),
        ])
        if (cancelled) return
        setSummary(sumRes.data)
        setTransactions(Array.isArray(txRes.data?.items) ? txRes.data.items : [])
        setTransactionTotal(txRes.data?.total ?? 0)
        setRevenue(revRes.data)
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao carregar dados financeiros:', {
            message: err?.message,
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            data: err?.response?.data,
            url: err?.config?.url,
          })
          setError('Não foi possível carregar os dados financeiros.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [appliedFilters])

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  function handleFilterSubmit(e) {
    e.preventDefault()
    setAppliedFilters(filters)
  }

  async function handleExport() {
    setExportLoading(true)
    setExportError('')
    try {
      const body = {}
      if (filters.periodStart) body.periodStart = filters.periodStart
      if (filters.periodEnd) body.periodEnd = filters.periodEnd
      if (filters.studentNumber) body.studentNumber = filters.studentNumber

      if (!body.periodStart || !body.periodEnd) {
        setExportError('Seleciona um período (data início e data fim) antes de exportar.')
        return
      }

      const res = await api.post('/admin/finance/export', body, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      const dateTag = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `financeiro_${dateTag}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setAppliedFilters(filters)
    } catch (err) {
      console.error('Erro ao exportar CSV:', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
      })
      setExportError('Erro ao exportar CSV.')
    } finally {
      setExportLoading(false)
    }
  }

  const chartData = revenue?.months ?? []

  return (
    <AdminShell
      title="Finanças"
      subtitle="Movimentações financeiras, resumo e exportação"
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
          title="Receita Total"
          value={`${fmt(summary?.totalRevenue ?? 0)} €`}
          description="Sessões de coaching"
        />
        <KPICard
          title="Total Penalizações"
          value={`${fmt(summary?.totalPenalties ?? 0)} €`}
          description="No-shows e cancelamentos"
        />
        <KPICard
          title="Entradas"
          value={summary?.totalEntries ?? 0}
          description="Total de registos"
        />
        <KPICard
          title="Exportados"
          value={summary?.exportedCount ?? 0}
          description={`Por exportar: ${summary?.unexportedCount ?? 0}`}
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
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nº aluno (opcional)</span>
          <input
            type="text"
            value={filters.studentNumber}
            onChange={(e) => handleFilterChange('studentNumber', e.target.value)}
            placeholder="ST-0001"
            style={{ borderRadius: '0.5rem', border: '1px solid var(--studio-line, #ccc)', padding: '0.45rem 0.65rem' }}
          />
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
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            background: 'var(--studio-cta-secondary-start, #55436d)',
            border: 0,
            borderRadius: '999px',
            color: '#fff',
            cursor: exportLoading ? 'not-allowed' : 'pointer',
            font: 'inherit',
            fontWeight: 600,
            opacity: exportLoading ? 0.7 : 1,
            padding: '0.5rem 1.1rem',
          }}
        >
          {exportLoading ? 'A exportar…' : 'Exportar CSV'}
        </button>
      </form>

      {exportError ? (
        <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{exportError}</p>
      ) : null}

      {/* Transactions table */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.75rem' }}>
          Movimentações ({transactionTotal})
        </h3>
        <Table
          columns={TABLE_COLUMNS}
          rows={transactions}
          getRowKey={(row) => row.entryId}
          emptyState={loading ? 'A carregar…' : 'Sem movimentações para o período selecionado.'}
        />
      </section>

      {/* Revenue chart */}
      <section>
        <h3 style={{ margin: '0 0 0.75rem' }}>
          Receita mensal — {revenue?.year ?? new Date().getFullYear()}
        </h3>
        <div
          style={{
            background: 'var(--studio-panel, #fff)',
            border: '1px solid var(--studio-line, #e2d9eb)',
            borderRadius: '1rem',
            padding: '1.25rem',
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" €" />
              <Tooltip formatter={(val) => `${Number(val).toFixed(2)} €`} />
              <Legend />
              <Bar dataKey="revenue" name="Sessões (€)" fill="#0b9d8f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="penalties" name="Penalizações (€)" fill="#f08a5d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </AdminShell>
  )
}
