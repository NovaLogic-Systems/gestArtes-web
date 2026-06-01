/**
 * @file src/pages/student/MarketplacePage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

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
import './DashboardPage.css'
import './marketplace.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import { localizeApiError } from '../../utils/apiErrors'

const SEARCH_HISTORY_KEY = 'marketplace.search.history'
const SEARCH_HISTORY_LIMIT = 8
const DEBOUNCE_DELAY = 300 // 300ms as per UX best practice

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

/**
 * Parse URL query parameters into filters object
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Object} Filters object with search, category, location, minPrice, maxPrice
 */
function parseFiltersFromURL(params) {
  return {
    search: params.get('search') || '',
    category: params.get('category') || '',
    location: params.get('location') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
  }
}

/**
 * Build URL query string from filters
 * @param {Object} filters - Filters object
 * @returns {string} Query string to append to URL
 */
function buildURLFromFilters(filters) {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.location) params.set('location', filters.location)
  if (filters.minPrice) params.set('minPrice', filters.minPrice)
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)

  return params.toString()
}

export default function MarketplacePage() {
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
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory)

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(location.search)
    return parseFiltersFromURL(params)
  })

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'
  const currentUserId = user?.id ?? null
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleLabel = isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')

  const handleToggle = useCallback(() => {
    if (isMobile) { setMobileOpen((v) => !v) } else { setSidebarCollapsed((v) => !v) }
  }, [isMobile])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
        setError(listingsResult.localizeApiError(reason, 'Não foi possível carregar o marketplace.'))
      }

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

  const visibleListings = useMemo(() => {
    if (!currentUserId) {
      return listings
    }

    return listings.filter((listing) => String(listing?.sellerId || listing?.seller?.userId || '') !== String(currentUserId))
  }, [currentUserId, listings])

  // Debounce effect: sync filters to URL after 300ms of inactivity
  // This prevents excessive URL updates and potential API calls during rapid filter changes
  useEffect(() => {
    const queryString = buildURLFromFilters(filters)
    const newUrl = queryString ? `/student/marketplace?${queryString}` : '/student/marketplace'

    // Only navigate if the URL actually changed to avoid unnecessary updates
    if (location.pathname + location.search !== newUrl) {
      const timeoutId = setTimeout(() => {
        navigate(newUrl, { replace: true })
      }, DEBOUNCE_DELAY)

      return () => clearTimeout(timeoutId)
    }
  }, [filters, navigate, location.pathname, location.search])

  const filteredListings = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const locationTerm = filters.location.trim().toLowerCase()
    const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
    const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)

    return visibleListings.filter((listing) => {
      const listingSearchable = [
        listing.title,
        listing.description,
        listing.category?.categoryName,
        listing.location,
      ]
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
  }, [filters, visibleListings])

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
    <div className="student-dashboard market-page">
      <a href="#market-main" className="skip-to-content">Ir para o conteúdo principal</a>
      <div className={appShellClassName}>
        {isMobile && mobileOpen ? (
          <button type="button" className="sidebar-overlay" aria-label="Fechar navegação lateral" onClick={() => setMobileOpen(false)} />
        ) : null}
        <aside className={sidebarClassName} id="sidebar">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{studentName}</p>
            </div>
          </div>

          <nav className="nav-group" aria-label="Navegação do aluno">
            <h2>Aluno</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href} aria-current={isActive ? 'page' : undefined} onClick={() => isMobile && setMobileOpen(false)}>
                  {item.label}
                </Link>
              )
            })}
            <button className="nav-link" type="button" onClick={async () => { await logout(); navigate('/login?reason=logged-out', { replace: true }) }}>
              Terminar Sessão
            </button>
          </nav>
        </aside>

        <main className="main" id="market-main">
          <header className="topbar">
            <div className="topbar-left">
              <button type="button" className="sidebar-toggle-btn" aria-label={toggleLabel} aria-controls="sidebar" aria-expanded={mobileOpen} onClick={handleToggle}>{toggleSymbol}</button>
              <div>
                <h2>Marketplace da Comunidade</h2>
              </div>
            </div>

            <div className="topbar-right">
              <button type="button" className="cta" onClick={() => setIsCreateOpen(true)}>
                Criar anúncio
              </button>
              <Link className="pill" to="/student/marketplace/my-listings">
                Meus anúncios
              </Link>
              <NotificationsBell pageLink="/student/notifications" />
            </div>
          </header>

          <section className="content-grid market-layout">
            <article className="panel market-filters">
              <h3>Pesquisa e filtros</h3>

              <div className="market-field-row">
                <input
                  className="search"
                  placeholder="Pesquisar por título, descrição ou categoria"
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
                <span>Localização</span>
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
                <h3>Feed de anúncios</h3>
                {!loading && visibleListings.length > 0 ? (
                  <p className="market-count-info">
                    {filteredListings.length} de {visibleListings.length} anúncio{visibleListings.length !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar anúncios...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Não encontramos anúncios com os filtros atuais.</p>
              ) : (
                <div className="market-listing-grid">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.listingId}
                      listing={listing}
                      onOpen={handleOpenListing}
                      onBuy={handleOpenListing}
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
      />

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Criar anúncio"
        description="Publica um artigo no marketplace da comunidade"
        size="xl"
      >
        <ListingForm
          key="student-marketplace-create"
          categories={categories}
          conditions={conditions}
          submitLabel="Publicar anúncio"
          busy={isSaving}
          onSubmit={handleCreateListing}
          onCancel={() => setIsCreateOpen(false)}
        />
      </Modal>
    </div>
  )
}
