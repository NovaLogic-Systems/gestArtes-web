/**
 * @file src/pages/student/MyListingsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './marketplace.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
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

export default function MyListingsPage() {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'
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
      setError(localizeApiError(requestError, 'Não foi possível carregar os teus anúncios.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredListings = useMemo(() => listings.filter(isVisibleListing), [listings])

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
    const confirmed = window.confirm(`Queres apagar o anúncio "${listing.title}"?`)

    if (!confirmed) {
      return
    }

    try {
      await deleteMarketplaceListing(listing.listingId)
      await loadData()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível apagar o anúncio.'))
    }
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
              <p>{studentName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Aluno</h2>
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
                <h2>Meus anúncios</h2>
                <p>Gere os teus anúncios ativos, edita detalhes e remove quando necessário.</p>
              </div>
            </div>
            <div className="topbar-right">
              <NotificationsBell pageLink="/student/notifications" />
              <Link className="pill" to="/student/marketplace">
                Voltar ao feed
              </Link>
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <h3>Lista de anúncios</h3>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar os teus anúncios...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Ainda não tens anúncios publicados.</p>
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
        description="Atualiza o conteúdo do teu anúncio"
        size="xl"
      >
        <ListingForm
          key={editingListing?.listingId ?? 'student-marketplace-edit'}
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
