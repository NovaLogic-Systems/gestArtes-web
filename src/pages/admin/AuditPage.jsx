import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { KPICard } from '../../components/ui/KPICard'
import { Table } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import api from '../../services/api'
import AdminShell from './AdminShell'

const MODULES = ['finance', 'coaching', 'validations', 'marketplace', 'inventory', 'lostfound', 'users', 'system']

const MODULE_LABELS = {
  finance: 'Finanças',
  coaching: 'Aulas/Sessões',
  validations: 'Validações',
  marketplace: 'Marketplace',
  inventory: 'Inventário',
  lostfound: 'Perdidos e Achados',
  users: 'Utilizadores',
  studios: 'Estúdios',
  auth: 'Autenticação',
  system: 'Sistema',
}

const ACTION_LABELS = {
  FINANCE_EXPORT: 'Exportação Financeira',
  NOSHOW_PENALTY_APPLIED: 'Penalização No-Show',
  SESSION_FINALIZED: 'Sessão Finalizada',
  SESSION_CANCELLED: 'Sessão Cancelada',
  SESSION_CREATED: 'Sessão Criada',
  SESSION_APPROVED: 'Sessão Aprovada',
  SESSION_REJECTED: 'Sessão Rejeitada',
  VALIDATION_APPROVED: 'Validação Aprovada',
  VALIDATION_REJECTED: 'Validação Rejeitada',
  LOSTFOUND_CLAIMED: 'Item Reclamado',
  LOSTFOUND_ARCHIVED: 'Item Arquivado',
  MARKETPLACE_HIDDEN: 'Anúncio Ocultado',
  MARKETPLACE_APPROVED: 'Anúncio Aprovado',
  MARKETPLACE_REJECTED: 'Anúncio Rejeitado',
  INVENTORY_RENTAL_APPROVED: 'Aluguer Aprovado',
  INVENTORY_RENTAL_REJECTED: 'Aluguer Rejeitado',
  INVENTORY_RETURN_VERIFIED: 'Devolução Verificada',
  INVENTORY_ITEM_CREATED: 'Artigo Criado',
  INVENTORY_ITEM_UPDATED: 'Artigo Atualizado',
  INVENTORY_ITEM_DELETED: 'Artigo Removido',
  USER_PASSWORD_RESET: 'Redefinição de Palavra-passe',
  USER_CREATED: 'Utilizador Criado',
  USER_UPDATED: 'Utilizador Atualizado',
  USER_SUSPENDED: 'Utilizador Suspenso',
  USER_LOGIN: 'Início de Sessão',
  USER_LOGOUT: 'Fim de Sessão',
}

const ROLE_LABELS = {
  admin: 'Direção',
  teacher: 'Professor',
  student: 'Aluno',
  guardian: 'Encarregado de Educação',
  system: 'Sistema',
}

const RESULT_LABELS = {
  success: 'Sucesso',
  failure: 'Falha',
}

// Best-effort: traduz fragmentos comuns em inglês nos detalhes de auditoria para PT-PT.
const DETAIL_DICTIONARY = [
  [/\bexported\b/gi, 'exportado'],
  [/\bcreated\b/gi, 'criado'],
  [/\bupdated\b/gi, 'atualizado'],
  [/\bdeleted\b/gi, 'removido'],
  [/\bremoved\b/gi, 'removido'],
  [/\bapproved\b/gi, 'aprovado'],
  [/\brejected\b/gi, 'rejeitado'],
  [/\bcancelled\b/gi, 'cancelado'],
  [/\bcanceled\b/gi, 'cancelado'],
  [/\bfinalized\b/gi, 'finalizado'],
  [/\bverified\b/gi, 'verificado'],
  [/\bsuspended\b/gi, 'suspenso'],
  [/\bclaimed\b/gi, 'reclamado'],
  [/\barchived\b/gi, 'arquivado'],
  [/\bhidden\b/gi, 'ocultado'],
  [/\blogged in\b/gi, 'iniciou sessão'],
  [/\blogged out\b/gi, 'terminou sessão'],
  [/\bpassword reset\b/gi, 'palavra-passe redefinida'],
  [/\bby\b/gi, 'por'],
  [/\bfor\b/gi, 'para'],
  [/\bfrom\b/gi, 'de'],
  [/\bto\b/gi, 'para'],
  [/\bsession\b/gi, 'sessão'],
  [/\buser\b/gi, 'utilizador'],
  [/\bitem\b/gi, 'artigo'],
  [/\brental\b/gi, 'aluguer'],
  [/\breturn\b/gi, 'devolução'],
  [/\blisting\b/gi, 'anúncio'],
  [/\bpenalty\b/gi, 'Penalização de'],
]

function localizeAuditDetail(detail) {
  if (!detail) return '—'
  let text = String(detail)
  for (const [pattern, replacement] of DETAIL_DICTIONARY) {
    text = text.replace(pattern, replacement)
  }
  return text
}

function localizeRole(role) {
  if (!role) return '—'
  return ROLE_LABELS[String(role).toLowerCase()] || role
}

function formatAuditTimestamp(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'medium' })
}

function escapeCsvField(value) {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function buildAuditCsv(rows) {
  const headers = [
    'Data/Hora',
    'Utilizador',
    'Perfil',
    'Ação',
    'Módulo',
    'Tipo de Alvo',
    'ID do Alvo',
    'Resultado',
    'Detalhe',
  ]

  const lines = [headers.join(';')]

  for (const row of rows) {
    lines.push([
      formatAuditTimestamp(row.timestamp),
      row.userName || (row.userId ? `#${row.userId}` : '—'),
      localizeRole(row.userRole),
      ACTION_LABELS[row.action] || row.action || '—',
      MODULE_LABELS[row.module] || row.module || '—',
      row.targetType || '—',
      row.targetId || '—',
      RESULT_LABELS[row.result] || row.result || '—',
      localizeAuditDetail(row.detail),
    ].map(escapeCsvField).join(';'))
  }

  // BOM para o Excel reconhecer UTF-8 corretamente
  return `﻿${lines.join('\r\n')}`
}

function downloadCsv(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const getDateOffsetString = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const INITIAL_FILTERS = {
  periodStart: getDateOffsetString(-7),
  periodEnd: getDateOffsetString(0),
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
  { key: 'userRole', header: 'Perfil', render: (row) => localizeRole(row.userRole) },
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
  { key: 'detail', header: 'Detalhe', render: (row) => localizeAuditDetail(row.detail) },
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
  const [exporting, setExporting] = useState(false)
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

  async function handleExportCsv() {
    if (exporting) return
    setExporting(true)
    setError('')
    try {
      const params = {}
      if (appliedFilters.periodStart) params.periodStart = appliedFilters.periodStart
      if (appliedFilters.periodEnd) params.periodEnd = appliedFilters.periodEnd
      if (appliedFilters.module) params.module = appliedFilters.module

      const response = await api.get('/admin/audit', {
        params: { ...params, limit: 100000, offset: 0 },
      })
      const rows = Array.isArray(response.data?.items) ? response.data.items : []

      if (rows.length === 0) {
        setError('Não há eventos de auditoria para exportar com os filtros atuais.')
        return
      }

      const stamp = new Date().toISOString().slice(0, 10)
      downloadCsv(buildAuditCsv(rows), `auditoria-gestartes-${stamp}.csv`)
    } catch (err) {
      console.error('Erro ao exportar auditoria:', err)
      setError('Não foi possível exportar o CSV de auditoria.')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(eventTotal / pageSize))
  const firstItem = eventTotal === 0 ? 0 : ((currentPage - 1) * pageSize) + 1
  const lastItem = Math.min(eventTotal, currentPage * pageSize)

  return (
    <AdminShell
      title="Auditoria"
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
          <h3 style={{ margin: 0 }}>
            Eventos de auditoria ({eventTotal})
          </h3>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading || eventTotal === 0}
            style={{
              background: 'var(--studio-cta-start, #0b9d8f)',
              border: 0,
              borderRadius: '999px',
              color: '#fff',
              cursor: (exporting || loading || eventTotal === 0) ? 'not-allowed' : 'pointer',
              font: 'inherit',
              fontWeight: 600,
              opacity: (exporting || loading || eventTotal === 0) ? 0.7 : 1,
              padding: '0.5rem 1.1rem',
            }}
          >
            {exporting ? 'A exportar…' : 'Exportar CSV'}
          </button>
        </div>
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
