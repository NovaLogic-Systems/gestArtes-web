import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
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
import '../student/DashboardPage.css'
import '../student/marketplace.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Pedidos de admissão', href: '/teacher/admission-requests' },
  { label: 'Marketplace', href: '/teacher/marketplace' },
  { label: 'Os meus anúncios', href: '/teacher/marketplace/my-listings' },
]

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

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [myListings, options] = await Promise.all([getMyMarketplaceListings(), getMarketplaceOptions()])
      setListings(myListings)
      setCategories(options.categories ?? [])
      setConditions(options.conditions ?? [])
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Nao foi possivel carregar os teus anuncios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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

    await deleteMarketplaceListing(listing.listingId)
    await loadData()
  }

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
    <div className="student-dashboard market-page">
      <div className="app-shell">
        <aside className="sidebar" id="sidebar">
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
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href}>
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
              <h2>Os meus anúncios</h2>
              <p>Gere os teus anuncios ativos, edita detalhes e remove quando necessario.</p>
            </div>
            <div className="topbar-right">
              <Link className="pill" to="/teacher/marketplace">
                Voltar ao feed
              </Link>
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <h3>Lista de anúncios</h3>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar os teus anuncios...</p> : null}

              {!loading && listings.length === 0 ? (
                <p className="empty">Ainda nao tens anuncios publicados.</p>
              ) : (
                <div className="market-listing-grid">
                  {listings.map((listing) => (
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