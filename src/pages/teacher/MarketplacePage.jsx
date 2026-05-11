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
import ListingForm from '../../components/ListingForm'
import Modal from '../../components/ui/Modal'
import '../admin-studios.css'
import '../student/marketplace.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

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
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory)

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
  })

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : '☰'
  const sidebarToggleLabel = mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
    }
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

      const [listingsResult, optionsResult] = await Promise.allSettled([
        listMarketplaceListings(),
        getMarketplaceOptions(),
      ])

      if (listingsResult.status === 'fulfilled') {
        setListings(listingsResult.value)
      } else {
        setListings([])
        setError(listingsResult.reason?.response?.data?.error || 'Nao foi possivel carregar o marketplace.')
      }

      if (optionsResult.status === 'fulfilled') {
        setCategories(optionsResult.value.categories ?? [])
        setConditions(optionsResult.value.conditions ?? [])
      } else {
        setCategories([])
        setConditions([])
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Nao foi possivel carregar o marketplace.')
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

  const filteredListings = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const locationTerm = filters.location.trim().toLowerCase()
    const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
    const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)

    return listings.filter((listing) => {
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

      if (minPrice !== null && Number(listing.price) < minPrice) {
        return false
      }

      if (maxPrice !== null && Number(listing.price) > maxPrice) {
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
    setFilters({ search: '', category: '', location: '', minPrice: '', maxPrice: '' })
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
    try {
      const fresh = await getMarketplaceListingById(listing.listingId)
      setSelectedListing(fresh || listing)
      setIsDetailOpen(true)
    } catch {
      setSelectedListing(listing)
      setIsDetailOpen(true)
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

  return (
    <div className="market-page">
      <div className="app-shell">
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
                <h2>Marketplace da Comunidade</h2>
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
                <span>Categoria</span>
                <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                  <option value="">Todas</option>
                  {categories.map((category) => (
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
                <h3>Feed de anuncios</h3>
                {!loading && listings.length > 0 ? (
                  <p className="market-count-info">
                    {filteredListings.length} de {listings.length} anuncio{listings.length !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar anuncios...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Nao encontramos anuncios com os filtros atuais.</p>
              ) : (
                <div className="market-listing-grid">
                  {filteredListings.map((listing) => (
                    <ListingCard key={listing.listingId} listing={listing} onOpen={handleOpenListing} />
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
    </div>
  )
}