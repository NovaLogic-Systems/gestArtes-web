import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import {
  createInventoryRental,
  listInventoryItems,
  listMyInventoryRentals,
} from '../../services/inventory'

const PAYMENT_METHOD_OPTIONS = [
  { id: 1, label: 'Pagamento presencial' },
  { id: 2, label: 'Multibanco' },
  { id: 3, label: 'MB Way' },
]

const RENTAL_STATUS_BADGE = {
  pending: { variant: 'warning', label: 'Pendente' },
  'condition-checked': { variant: 'info', label: 'Condição verificada' },
  'return-verified': { variant: 'info', label: 'Devolução verificada' },
  completed: { variant: 'success', label: 'Concluído' },
  pending_validation: { variant: 'warning', label: 'Pendente' },
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(2)} €`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-PT')
}

function toIsoDate(dateString) {
  if (!dateString) return null
  return `${dateString}T00:00:00.000Z`
}

export default function TeacherInventoryPage() {
  const { logout, user, role } = useAuth()
  const navigate = useNavigate()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

  const [activeTab, setActiveTab] = useState('items')
  const [items, setItems] = useState([])
  const [rentals, setRentals] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingRentals, setLoadingRentals] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', category: '', onlyAvailable: false })

  const [rentalModal, setRentalModal] = useState({ open: false, item: null })
  const [rentalForm, setRentalForm] = useState({ startDate: '', endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
  const [submittingRental, setSubmittingRental] = useState(false)
  const [rentalError, setRentalError] = useState('')

  const loadItems = useCallback(async () => {
    try {
      setLoadingItems(true)
      setError('')
      const data = await listInventoryItems({
        category: filters.category || undefined,
        onlyAvailable: filters.onlyAvailable,
      })
      setItems(data)
    } catch (err) {
      setItems([])
      setError(err?.response?.data?.error || 'Não foi possível carregar o inventário.')
    } finally {
      setLoadingItems(false)
    }
  }, [filters.category, filters.onlyAvailable])

  const loadRentals = useCallback(async () => {
    try {
      setLoadingRentals(true)
      const data = await listMyInventoryRentals()
      setRentals(data)
    } catch (err) {
      setRentals([])
      setError((previous) => previous || err?.response?.data?.error || 'Não foi possível carregar as reservas.')
    } finally {
      setLoadingRentals(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    loadRentals()
  }, [loadRentals])

  const categories = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      if (item.category?.categoryId && !map.has(item.category.categoryId)) {
        map.set(item.category.categoryId, item.category.categoryName)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    if (!search) return items
    return items.filter((item) => {
      const haystack = [item.itemName, item.description, item.category?.categoryName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [items, filters.search])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  async function handleLogout() {
    await logout()
    navigate('/login?reason=logged-out', { replace: true })
  }

  function openRentalModal(item) {
    const today = new Date().toISOString().slice(0, 10)
    setRentalForm({ startDate: today, endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
    setRentalError('')
    setRentalModal({ open: true, item })
  }

  function closeRentalModal() {
    if (submittingRental) return
    setRentalModal({ open: false, item: null })
    setRentalError('')
  }

  async function submitRental(event) {
    event.preventDefault()
    if (!rentalModal.item) return
    if (!rentalForm.startDate) {
      setRentalError('A data de início é obrigatória.')
      return
    }
    if (rentalForm.endDate && rentalForm.endDate < rentalForm.startDate) {
      setRentalError('A data de fim não pode ser anterior à data de início.')
      return
    }

    try {
      setSubmittingRental(true)
      setRentalError('')
      await createInventoryRental({
        inventoryItemId: rentalModal.item.itemId,
        startDate: toIsoDate(rentalForm.startDate),
        endDate: rentalForm.endDate ? toIsoDate(rentalForm.endDate) : undefined,
        paymentMethodId: Number(rentalForm.paymentMethodId),
      })
      setRentalModal({ open: false, item: null })
      await Promise.all([loadItems(), loadRentals()])
      setActiveTab('myRentals')
    } catch (err) {
      setRentalError(err?.response?.data?.error || err?.response?.data?.message || 'Não foi possível criar a reserva.')
    } finally {
      setSubmittingRental(false)
    }
  }

  const itemColumns = [
    {
      key: 'itemName',
      header: 'Artigo',
      render: (row) => (
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <strong>{row.itemName}</strong>
          {row.description ? (
            <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{row.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (row) => row.category?.categoryName ?? '—',
    },
    {
      key: 'availability',
      header: 'Disponível',
      align: 'center',
      render: (row) => (
        <Badge variant={row.availableQuantity > 0 ? 'success' : 'danger'}>
          {row.availableQuantity} / {row.totalQuantity}
        </Badge>
      ),
    },
    {
      key: 'symbolicFee',
      header: 'Taxa',
      align: 'right',
      render: (row) => formatCurrency(row.symbolicFee),
    },
  ]

  const rentalColumns = [
    {
      key: 'reference',
      header: 'Referência',
      render: (row) => row.reference ?? `#${row.rentalId}`,
    },
    {
      key: 'item',
      header: 'Artigo',
      render: (row) => row.item?.itemName ?? '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const meta = RENTAL_STATUS_BADGE[row.status] ?? { variant: 'neutral', label: row.status ?? '—' }
        return <Badge variant={meta.variant}>{meta.label}</Badge>
      },
    },
    {
      key: 'startDate',
      header: 'Início',
      render: (row) => formatDate(row.startDate),
    },
    {
      key: 'endDate',
      header: 'Fim',
      render: (row) => formatDate(row.endDate),
    },
    {
      key: 'fee',
      header: 'Taxa',
      align: 'right',
      render: (row) => formatCurrency(row.symbolicFee ?? row.estimatedTotal),
    },
  ]

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: 'var(--bg)' }}>
      <header
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <p style={{ color: '#666', margin: 0 }}>
            {displayName} · {String(role || '').toUpperCase()}
          </p>
          <h1 style={{ margin: 0 }}>Inventário da Escola</h1>
          <p style={{ color: '#555', margin: '0.25rem 0 0' }}>
            Consulta os artigos disponíveis e gere as tuas reservas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button as="a" href="/teacher/dashboard" variant="secondary">
            Voltar ao Dashboard
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Terminar sessão
          </Button>
        </div>
      </header>

      <div role="tablist" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Button
          role="tab"
          aria-selected={activeTab === 'items'}
          variant={activeTab === 'items' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('items')}
        >
          Itens disponíveis
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === 'myRentals'}
          variant={activeTab === 'myRentals' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('myRentals')}
        >
          As minhas reservas ({rentals.length})
        </Button>
      </div>

      {error ? (
        <div
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '0.75rem',
            color: '#b91c1c',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {activeTab === 'items' ? (
        <section>
          <div
            style={{
              alignItems: 'end',
              display: 'grid',
              gap: '0.75rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              marginBottom: '1rem',
            }}
          >
            <label style={{ display: 'grid', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>Pesquisar</span>
              <input
                type="search"
                placeholder="Nome, descrição ou categoria"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  font: 'inherit',
                  padding: '0.6rem 0.85rem',
                }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>Categoria</span>
              <select
                value={filters.category}
                onChange={(event) => updateFilter('category', event.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  font: 'inherit',
                  padding: '0.6rem 0.85rem',
                }}
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', paddingTop: '1.4rem' }}>
              <input
                type="checkbox"
                checked={filters.onlyAvailable}
                onChange={(event) => updateFilter('onlyAvailable', event.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Apenas disponíveis</span>
            </label>
          </div>

          {loadingItems ? (
            <p style={{ color: 'var(--text)' }}>A carregar artigos…</p>
          ) : (
            <Table
              columns={itemColumns}
              rows={filteredItems}
              getRowKey={(row) => row.itemId}
              emptyState="Sem artigos para apresentar."
              renderRowActions={(row) => (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={row.availableQuantity <= 0}
                  onClick={() => openRentalModal(row)}
                >
                  Reservar
                </Button>
              )}
            />
          )}
        </section>
      ) : null}

      {activeTab === 'myRentals' ? (
        <section>
          {loadingRentals ? (
            <p style={{ color: 'var(--text)' }}>A carregar reservas…</p>
          ) : (
            <Table
              columns={rentalColumns}
              rows={rentals}
              getRowKey={(row) => row.rentalId}
              emptyState="Ainda não tens reservas."
            />
          )}
        </section>
      ) : null}

      <Modal
        open={rentalModal.open}
        title={rentalModal.item ? `Reservar “${rentalModal.item.itemName}”` : 'Reservar artigo'}
        description="Seleciona as datas e o método de pagamento da reserva."
        size="md"
        onClose={closeRentalModal}
        closeOnBackdrop={!submittingRental}
      >
        <form onSubmit={submitRental} style={{ display: 'grid', gap: '0.85rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>Data de início</span>
            <input
              type="date"
              required
              value={rentalForm.startDate}
              onChange={(event) => setRentalForm((current) => ({ ...current, startDate: event.target.value }))}
              style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', font: 'inherit', padding: '0.6rem 0.85rem' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>Data de fim (opcional)</span>
            <input
              type="date"
              value={rentalForm.endDate}
              onChange={(event) => setRentalForm((current) => ({ ...current, endDate: event.target.value }))}
              style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', font: 'inherit', padding: '0.6rem 0.85rem' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>Método de pagamento</span>
            <select
              value={rentalForm.paymentMethodId}
              onChange={(event) => setRentalForm((current) => ({ ...current, paymentMethodId: event.target.value }))}
              style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', font: 'inherit', padding: '0.6rem 0.85rem' }}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {rentalModal.item ? (
            <div
              style={{
                background: 'var(--social-bg)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Taxa simbólica: <strong>{formatCurrency(rentalModal.item.symbolicFee)}</strong>
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                Disponível: {rentalModal.item.availableQuantity} / {rentalModal.item.totalQuantity}
              </p>
            </div>
          ) : null}

          {rentalError ? (
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '0.75rem',
                color: '#b91c1c',
                padding: '0.6rem 0.9rem',
              }}
            >
              {rentalError}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={closeRentalModal} disabled={submittingRental}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submittingRental}>
              {submittingRental ? 'A reservar…' : 'Confirmar reserva'}
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  )
}
