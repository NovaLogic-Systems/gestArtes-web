import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import NotificationsBell from '../../components/NotificationsBell'
import ListingCard from '../../components/ListingCard'
import ListingDetailModal from '../../components/ListingDetailModal'
import ListingForm from '../../components/ListingForm'
import Modal from '../../components/ui/Modal'
import {
  deleteMarketplaceListing,
  getMarketplaceListingById,
  getMarketplaceOptions,
  getMyMarketplaceListings,
  updateMarketplaceListing,
} from '../../services/marketplace'
import '../admin-studios.css'
import '../student/marketplace.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'
import { localizeApiError } from '../../utils/apiErrors'

function isVisibleListing(listing) {
  const statusName = String(listing?.status?.statusName || listing?.status || '').trim().toLowerCase()

  if (!statusName) {
    return true
  }

  return !(
    statusName.includes('removed') ||
    statusName.includes('remov') ||
    statusName.includes('inactive') ||
    statusName.includes('inativo') ||
    statusName.includes('hidden') ||
    statusName.includes('ocult')
  )
}

export default function TeacherMarketplaceListingsPage() {
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
  const [editingListing, setEditingListing] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const sidebarToggleLabel = isMobile ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral') : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

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
      const [myListings, options] = await Promise.all([getMyMarketplaceListings(), getMarketplaceOptions()])
      setListings(myListings)
      setCategories(options.categories ?? [])
      setConditions(options.conditions ?? [])
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Nao foi possivel carregar os teus anuncios.'))
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
        setSidebarCollapsed(false)
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

  async function handleDeleteListing(listing) {
    const confirmed = window.confirm(`Queres apagar o anuncio "${listing.title}"?`)

    if (!confirmed) {
      return
    }

    try {
      await deleteMarketplaceListing(listing.listingId)
      await loadData()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Nao foi possivel apagar o anuncio.'))
    }
  }

  const filteredListings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const visibleListings = listings.filter(isVisibleListing)

    if (!term) return visibleListings

    return visibleListings.filter((listing) =>
      Object.values(listing).join(' ').toLowerCase().includes(term)
    )
  }, [listings, searchTerm])

  async function handleEditSubmit(values, file) {
    try {
      setIsSaving(true)
      await updateMarketplaceListing(editingListing.listingId, values, file)
      setIsEditOpen(false)
      setEditingListing(null)
      await loadData()
    } finally {
      setIsSaving(false)
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
              <div className="topbar-heading">
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
                <h2>Os meus anúncios</h2>
              </div>
              <p>Gere os teus anuncios ativos, edita detalhes e remove quando necessario.</p>
            </div>
            <div className="topbar-right">
              <input
                type="search"
                className="topbar-search"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Link className="pill" to="/teacher/marketplace">
                Voltar ao feed
              </Link>
              <NotificationsBell pageLink="/teacher/notifications" />
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <h3>Lista de anúncios</h3>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar os teus anuncios...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Ainda nao tens anuncios publicados.</p>
              ) : (
                <div className="market-listing-grid">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.listingId}
                      listing={listing}
                      showOwnerActions
                      onOpen={handleOpenListing}
                      onEdit={(current) => {
                        setEditingListing(current)
                        setIsEditOpen(true)
                      }}
                      onDelete={handleDeleteListing}
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
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingListing(null)
        }}
        title="Editar anúncio"
        description="Atualiza o conteudo do teu anuncio"
        size="xl"
      >
        <ListingForm
          key={editingListing?.listingId ?? 'teacher-marketplace-edit'}
          initialValues={editingListing}
          categories={categories}
          conditions={conditions}
          submitLabel="Guardar alterações"
          busy={isSaving}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setIsEditOpen(false)
            setEditingListing(null)
          }}
        />
      </Modal>
    </div>
  )
}