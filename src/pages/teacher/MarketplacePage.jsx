import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import NotificationsBell from '../../components/NotificationsBell'
import ListingCard from '../../components/ListingCard'
import ListingDetailModal from '../../components/ListingDetailModal'
import {
  createMarketplaceListing,
  getMarketplaceListingById,
  getMarketplaceOptions,
  listMarketplaceListings,
} from '../../services/marketplace'
import {
  listInventoryItems,
  createInventoryRental
} from '../../services/inventory'
import ListingForm from '../../components/ListingForm'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import '../admin-studios.css'
import '../student/marketplace.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import { localizeApiError } from '../../utils/apiErrors'

const SEARCH_HISTORY_KEY = 'marketplace.search.history'
const SEARCH_HISTORY_LIMIT = 8

function loadSearchHistory() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value) => typeof value === 'string' && value.trim()).slice(0, SEARCH_HISTORY_LIMIT)
  } catch {
    return []
  }
}

function saveSearchHistory(entries) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, SEARCH_HISTORY_LIMIT)))
}

const PAYMENT_METHOD_OPTIONS = [
  { id: 1, label: 'MB Way' },
  { id: 2, label: 'Cartão' },
  { id: 3, label: 'Referência Multibanco' },
]

function toIsoDate(dateString) {
  if (!dateString) return null
  return `${dateString}T00:00:00.000Z`
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-PT', { currency: 'EUR', style: 'currency' }).format(Number(value))
}

export default function TeacherMarketplacePage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedListing, setSelectedListing] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory)

  // Rental modal states
  const [rentalModal, setRentalModal] = useState({ open: false, item: null })
  const [rentalForm, setRentalForm] = useState({ startDate: '', endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
  const [submittingRental, setSubmittingRental] = useState(false)
  const [rentalError, setRentalError] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    origin: 'all',
  })

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
      return
    }
    setSidebarCollapsed((value) => !value)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [isMobile])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [listingsResult, inventoryResult, optionsResult] = await Promise.allSettled([
        listMarketplaceListings(),
        listInventoryItems({ onlyAvailable: false }),
        getMarketplaceOptions(),
      ])

      let loadedListings = []
      let loadedInventory = []

      if (listingsResult.status === 'fulfilled') {
        loadedListings = listingsResult.value.map(item => ({
          ...item,
          id: `community-${item.listingId}`,
          origin: 'community'
        }))
      } else {
        setError(localizeApiError(listingsResult.reason, 'Não foi possível carregar o marketplace.'))
      }

      if (inventoryResult.status === 'fulfilled') {
        loadedInventory = inventoryResult.value.map(item => ({
          ...item,
          id: `school-${item.itemId}`,
          origin: 'school',
          title: item.itemName,
          price: item.symbolicFee,
          condition: { conditionName: item.conditionLabel || 'Verificado' },
          location: 'Escola'
        }))
      } else {
        setError(prev => prev || localizeApiError(inventoryResult.reason, 'Não foi possível carregar o inventário.'))
      }

      setListings([...loadedListings, ...loadedInventory])

      if (optionsResult.status === 'fulfilled') {
        setCategories(optionsResult.value.categories ?? [])
        setConditions(optionsResult.value.conditions ?? [])
      } else {
        setCategories([])
        setConditions([])
      }
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível carregar o marketplace.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)

      if (!mobile) {
        setMobileOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    onResize()

    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  const combinedCategories = useMemo(() => {
    const map = new Map()
    for (const cat of categories) {
      if (cat.categoryId) {
        map.set(String(cat.categoryId), cat.categoryName)
      }
    }
    for (const item of listings) {
      if (item.origin === 'school' && item.category?.categoryId) {
        map.set(String(item.category.categoryId), item.category.categoryName)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ categoryId: id, categoryName: name }))
  }, [categories, listings])

  const filteredListings = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const locationTerm = filters.location.trim().toLowerCase()
    const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
    const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)
    const originFilter = filters.origin || 'all'

    return listings.filter((listing) => {
      if (originFilter !== 'all' && listing.origin !== originFilter) {
        return false
      }

      const listingSearchable = [listing.title, listing.description, listing.category?.categoryName, listing.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (search && !listingSearchable.includes(search)) {
        return false
      }

      if (filters.category && String(listing.category?.categoryId || '') !== String(filters.category)) {
        return false
      }

      if (locationTerm && !String(listing.location || '').toLowerCase().includes(locationTerm)) {
        return false
      }

      const price = listing.origin === 'school' ? Number(listing.symbolicFee || 0) : Number(listing.price || 0)
      if (minPrice !== null && price < minPrice) {
        return false
      }

      if (maxPrice !== null && price > maxPrice) {
        return false
      }

      return true
    })
  }, [filters, listings])

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function clearFilters() {
    setFilters({ search: '', category: '', location: '', minPrice: '', maxPrice: '', origin: 'all' })
  }

  function storeSearchInHistory(value) {
    const term = String(value || '').trim()

    if (!term) {
      return
    }

    const entries = [term, ...searchHistory.filter((entry) => entry.toLowerCase() !== term.toLowerCase())].slice(
      0,
      SEARCH_HISTORY_LIMIT,
    )

    setSearchHistory(entries)
    saveSearchHistory(entries)
  }

  function clearSearchHistory() {
    setSearchHistory([])
    saveSearchHistory([])
  }

  async function handleOpenListing(listing) {
    if (listing.origin === 'school') {
      setSelectedListing(listing)
      setIsDetailOpen(true)
      return
    }
    // Open modal instantly with what we have in memory
    setSelectedListing(listing)
    setIsDetailOpen(true)
    
    // In background, fetch full listing details (like seller info)
    try {
      const fresh = await getMarketplaceListingById(listing.listingId)
      if (fresh) {
        setSelectedListing(fresh)
      }
    } catch {
      // Keep existing listing if background fetch fails
    }
  }

  async function handleCreateListing(values, file) {
    try {
      setIsSaving(true)
      await createMarketplaceListing(values, file)
      setIsCreateOpen(false)
      await loadData()
    } finally {
      setIsSaving(false)
    }
  }

  // School Rental modal handlers
  function openRentalModal(item) {
    setIsDetailOpen(false)
    setSelectedListing(null)
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
        inventoryItemId: rentalModal.item.itemId || Number(rentalModal.item.id.replace('school-', '')),
        startDate: toIsoDate(rentalForm.startDate),
        endDate: rentalForm.endDate ? toIsoDate(rentalForm.endDate) : undefined,
        paymentMethodId: Number(rentalForm.paymentMethodId),
      })
      setRentalModal({ open: false, item: null })
      await loadData()
    } catch (err) {
      setRentalError(localizeApiError(err, 'Não foi possível criar a reserva.'))
    } finally {
      setSubmittingRental(false)
    }
  }

  return (
    <div className="market-page">
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
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{teacherName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href} onClick={handleMobileNavClick}>
                  {item.label}
                </Link>
              )
            })}

            <button
              className="nav-link"
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login?reason=logged-out', { replace: true })
              }}
            >
              Terminar Sessao
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarToggleLabel}
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Marketplace</h2>
              </div>
            </div>

            <div className="topbar-right">
              <button type="button" className="cta" onClick={() => setIsCreateOpen(true)}>
                Criar anuncio
              </button>
              <Link className="pill" to="/teacher/marketplace/my-listings">
                Os meus anuncios
              </Link>
              <NotificationsBell pageLink="/teacher/notifications" />
            </div>
          </header>

          <section className="content-grid market-layout">
            <article className="panel market-filters">
              <h3>Pesquisa e filtros</h3>

              <div className="market-field-row">
                <input
                  className="search"
                  placeholder="Pesquisar por titulo, descricao ou categoria"
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  onBlur={(event) => storeSearchInHistory(event.target.value)}
                />
                <button type="button" className="market-search-save" onClick={() => storeSearchInHistory(filters.search)}>
                  Guardar pesquisa
                </button>
              </div>

              <label>
                <span>Origem</span>
                <select value={filters.origin} onChange={(event) => updateFilter('origin', event.target.value)}>
                  <option value="all">Todas as origens</option>
                  <option value="school">Escola (Aluguer)</option>
                  <option value="community">Comunidade (Venda/Troca)</option>
                </select>
              </label>

              <label>
                <span>Categoria</span>
                <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                  <option value="">Todas</option>
                  {combinedCategories.map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Localizacao</span>
                <input
                  value={filters.location}
                  onChange={(event) => updateFilter('location', event.target.value)}
                  placeholder="Ex.: Viana do Castelo"
                />
              </label>

              <div className="market-price-row">
                <label>
                  <span>Preco minimo</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={(event) => updateFilter('minPrice', event.target.value)}
                  />
                </label>
                <label>
                  <span>Preco maximo</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(event) => updateFilter('maxPrice', event.target.value)}
                  />
                </label>
              </div>

              <div className="market-filter-actions">
                <button type="button" className="market-btn market-btn-secondary" onClick={clearFilters}>
                  Limpar filtros
                </button>
              </div>

              <div className="market-history-box">
                <div className="market-history-head">
                  <h4>Historico de pesquisa</h4>
                  <button type="button" className="market-link-button" onClick={clearSearchHistory}>
                    Limpar
                  </button>
                </div>
                {searchHistory.length === 0 ? (
                  <p className="panel-subtle">Ainda sem pesquisas guardadas.</p>
                ) : (
                  <div className="market-history-list">
                    {searchHistory.map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        className="market-history-pill"
                        onClick={() => updateFilter('search', entry)}
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="market-feed-header">
                <h3>Catálogo de Artigos</h3>
                {!loading && listings.length > 0 ? (
                  <p className="market-count-info">
                    {filteredListings.length} de {listings.length} artigo{listings.length !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar artigos...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Nao encontramos artigos com os filtros atuais.</p>
              ) : (
                <div className="market-listing-grid">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onOpen={handleOpenListing}
                      onBuy={listing.origin === 'school' ? openRentalModal : handleOpenListing}
                      originLabel={
                        listing.origin === 'school'
                          ? 'Escola'
                          : listing.seller
                          ? [listing.seller.firstName, listing.seller.lastName].filter(Boolean).join(' ')
                          : 'Comunidade'
                      }
                    />
                  ))}
                </div>
              )}
            </article>
          </section>
        </main>
      </div>

      <ListingDetailModal
        open={isDetailOpen}
        listing={selectedListing}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedListing(null)
        }}
        onRent={openRentalModal}
      />

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Criar anuncio"
        description="Publica um artigo no marketplace da comunidade"
        size="xl"
      >
        <ListingForm
          key="teacher-marketplace-create"
          categories={categories}
          conditions={conditions}
          submitLabel="Publicar anuncio"
          busy={isSaving}
          onSubmit={handleCreateListing}
          onCancel={() => setIsCreateOpen(false)}
        />
      </Modal>

      {/* Modal: Alugar (School Rental Modal) */}
      <Modal
        open={rentalModal.open}
        title={rentalModal.item ? `Alugar "${rentalModal.item.title || rentalModal.item.itemName}"` : 'Alugar artigo'}
        description="Seleciona o período de aluguer e o método de pagamento."
        size="md"
        className="teacher-inventory-modal"
        onClose={closeRentalModal}
        closeOnBackdrop={!submittingRental}
        footer={
          <div className="modal-footer-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
            <div className="rental-summary" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f5edfb' }}>
              <p style={{ margin: '0 0 0.25rem' }}>Artigo: <strong>{rentalModal.item.title || rentalModal.item.itemName}</strong></p>
              <p style={{ margin: '0 0 0.25rem' }}>Taxa simbólica: <strong>{formatCurrency(rentalModal.item.price || rentalModal.item.symbolicFee)}</strong></p>
              <p style={{ margin: '0' }}>Disponível: <strong>{rentalModal.item.availableQuantity} / {rentalModal.item.totalQuantity}</strong></p>
            </div>
          ) : null}

          <label className="form-label" style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: '#4c4666' }}>Data de início</span>
            <input
              type="date"
              required
              className="form-input"
              style={{ padding: '0.56rem 0.7rem', border: '1px solid #d7ccdf', borderRadius: '10px', width: '100%' }}
              value={rentalForm.startDate}
              onChange={(e) => setRentalForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label className="form-label" style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: '#4c4666' }}>Data de fim (opcional)</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.56rem 0.7rem', border: '1px solid #d7ccdf', borderRadius: '10px', width: '100%' }}
              value={rentalForm.endDate}
              onChange={(e) => setRentalForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <label className="form-label" style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: '#4c4666' }}>Método de pagamento</span>
            <select
              className="form-select"
              style={{ padding: '0.56rem 0.7rem', border: '1px solid #d7ccdf', borderRadius: '10px', width: '100%' }}
              value={rentalForm.paymentMethodId}
              onChange={(e) => setRentalForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </label>

          {rentalError ? <p className="modal-error" style={{ color: '#b52142', margin: '0.5rem 0 0', fontWeight: 600 }}>{rentalError}</p> : null}
        </form>
      </Modal>
    </div>
  )
}