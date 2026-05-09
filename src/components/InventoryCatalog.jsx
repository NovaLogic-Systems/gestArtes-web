import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from './ui/Button'
import Input from './ui/Input'
import LoadingSkeleton from './ui/LoadingSkeleton'
import Modal from './ui/Modal'
import InventoryItemCard from './InventoryItemCard'
import { createInventoryRental, listInventoryItems } from '../services/inventory'

const PAYMENT_METHOD_OPTIONS = [
  { id: 1, label: 'MB Way' },
  { id: 2, label: 'Cartão' },
  { id: 3, label: 'Referência Multibanco' },
]

function toIsoDate(dateString) {
  if (!dateString) return null
  return `${dateString}T00:00:00.000Z`
}

function normalizeItem(item) {
  return { ...item, conditionLabel: item?.conditionLabel || 'Verificado' }
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-PT', { currency: 'EUR', style: 'currency' }).format(Number(value))
}

export default function InventoryCatalog({ onRentalCreated, modalClassName = "inventory-modal" }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availability, setAvailability] = useState('all')

  const [rentalModal, setRentalModal] = useState({ open: false, item: null })
  const [rentalForm, setRentalForm] = useState({ startDate: '', endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
  const [submittingRental, setSubmittingRental] = useState(false)
  const [rentalError, setRentalError] = useState('')

  const [detailModal, setDetailModal] = useState({ open: false, item: null })

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await listInventoryItems({ onlyAvailable: false })
      setItems(data.map(normalizeItem))
    } catch (err) {
      setItems([])
      setError(err?.response?.data?.error || 'Não foi possível carregar o inventário.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

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
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      if (term) {
        const haystack = [item.itemName, item.description, item.category?.categoryName]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (categoryFilter && String(item?.category?.categoryId || '') !== categoryFilter) return false
      if (availability === 'available' && Number(item?.availableQuantity ?? 0) <= 0) return false
      if (availability === 'reserved' && Number(item?.availableQuantity ?? 0) > 0) return false
      return true
    })
  }, [items, search, categoryFilter, availability])

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
    if (!rentalForm.startDate) { setRentalError('A data de início é obrigatória.'); return }
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
      await loadItems()
      if (onRentalCreated) onRentalCreated()
    } catch (err) {
      setRentalError(err?.response?.data?.error || err?.response?.data?.message || 'Não foi possível criar a reserva.')
    } finally {
      setSubmittingRental(false)
    }
  }

  return (
    <>
      <section className="inventory-layout">
        <aside className="inventory-filters panel">
          <h3>Filtros</h3>
          <Input
            label="Pesquisar"
            placeholder="Nome, categoria ou descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label>
            <span>Categoria</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Disponibilidade</span>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="all">Todos</option>
              <option value="available">Disponíveis</option>
              <option value="reserved">Reservados</option>
            </select>
          </label>
        </aside>

        <section className="inventory-feed panel">
          <div className="inventory-feed-header">
            <div>
              <h3>Catálogo</h3>
              <p>{filteredItems.length} artigo(s) encontrado(s)</p>
            </div>
            <Button variant="secondary" size="sm" onClick={loadItems}>
              Recarregar
            </Button>
          </div>

          {error ? <p className="inventory-error-banner">{error}</p> : null}

          {loading ? (
            <div className="inventory-skeleton-grid">
              <LoadingSkeleton variant="block" height="18rem" />
              <LoadingSkeleton variant="block" height="18rem" />
              <LoadingSkeleton variant="block" height="18rem" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="inventory-empty-state">
              <h4>Sem artigos para mostrar</h4>
              <p>Afina os filtros ou volta a carregar o catálogo.</p>
            </div>
          ) : (
            <div className="inventory-grid">
              {filteredItems.map((item) => (
                <InventoryItemCard
                  key={item.itemId}
                  item={item}
                  onOpenDetails={(i) => setDetailModal({ open: true, item: i })}
                  onRent={openRentalModal}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {/* Modal: Alugar */}
      <Modal
        open={rentalModal.open}
        title={rentalModal.item ? `Alugar "${rentalModal.item.itemName}"` : 'Alugar artigo'}
        description="Seleciona o período de aluguer e o método de pagamento."
        size="md"
        className={modalClassName}
        onClose={closeRentalModal}
        closeOnBackdrop={!submittingRental}
        footer={
          <div className="modal-footer-actions">
            <Button type="button" variant="secondary" onClick={closeRentalModal} disabled={submittingRental}>
              Cancelar
            </Button>
            <Button form="rental-form" type="submit" variant="cta" disabled={submittingRental}>
              {submittingRental ? 'A enviar pedido…' : 'Enviar pedido à direção'}
            </Button>
          </div>
        }
      >
        <form id="rental-form" className="modal-form" onSubmit={submitRental}>
          {rentalModal.item ? (
            <div className="rental-summary">
              <p>Artigo: <strong>{rentalModal.item.itemName}</strong></p>
              <p>Taxa simbólica: <strong>{formatCurrency(rentalModal.item.symbolicFee)}</strong></p>
              <p>Disponível: <strong>{rentalModal.item.availableQuantity} / {rentalModal.item.totalQuantity}</strong></p>
            </div>
          ) : null}

          <label className="form-label">
            <span>Data de início</span>
            <input
              type="date"
              required
              className="form-input"
              value={rentalForm.startDate}
              onChange={(e) => setRentalForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label className="form-label">
            <span>Data de fim (opcional)</span>
            <input
              type="date"
              className="form-input"
              value={rentalForm.endDate}
              onChange={(e) => setRentalForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <label className="form-label">
            <span>Método de pagamento</span>
            <select
              className="form-select"
              value={rentalForm.paymentMethodId}
              onChange={(e) => setRentalForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </label>

          {rentalError ? <p className="modal-error">{rentalError}</p> : null}
        </form>
      </Modal>

      {/* Modal: Detalhes */}
      <Modal
        open={detailModal.open}
        title={detailModal.item?.itemName ?? 'Detalhes do artigo'}
        description={detailModal.item?.description || 'Artigo do inventário escolar.'}
        size="lg"
        className={modalClassName}
        onClose={() => setDetailModal({ open: false, item: null })}
        footer={
          <div className="modal-footer-actions">
            {detailModal.item && Number(detailModal.item.availableQuantity ?? 0) > 0 ? (
              <Button
                variant="cta"
                onClick={() => {
                  const item = detailModal.item
                  setDetailModal({ open: false, item: null })
                  openRentalModal(item)
                }}
              >
                Alugar este artigo
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setDetailModal({ open: false, item: null })}>
              Fechar
            </Button>
          </div>
        }
      >
        {detailModal.item ? (
          <div className="inventory-detail-grid">
            <div>
              {detailModal.item.photoUrl
                ? <img className="inventory-detail-image" src={detailModal.item.photoUrl} alt={detailModal.item.itemName} />
                : <div className="inventory-detail-image inventory-detail-image-empty">Sem imagem</div>}
            </div>
            <div className="inventory-detail-body">
              <p><strong>Categoria:</strong> {detailModal.item.category?.categoryName ?? '—'}</p>
              <p><strong>Taxa simbólica:</strong> {formatCurrency(detailModal.item.symbolicFee)}</p>
              <p><strong>Condição:</strong> {detailModal.item.conditionLabel ?? 'Verificado'}</p>
              <p><strong>Estado:</strong> {Number(detailModal.item.availableQuantity ?? 0) > 0 ? 'Disponível' : 'Reservado'}</p>
              <p><strong>Unidades disponíveis:</strong> {detailModal.item.availableQuantity ?? 0}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
