/**
 * @file src/pages/admin/MarketplaceModerationPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import { useAuth } from '../../hooks/useAuth'
import adminMarketplaceService from '../../services/adminMarketplaceService'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import WithRole from '../../components/WithRole'
import { resolveMarketplacePhotoUrl } from '../../utils/marketplace-photo-url'
import '../admin-studios.css'
import './marketplace-moderation.css'
import { ADMIN_NAV_ITEMS as navigationItems } from './adminNav'
import { localizeApiError } from '../../utils/apiErrors'

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'removed', label: 'Removidos' },
]

function formatMoney(value) {
  const numeric = Number(value)

  if (Number.isNaN(numeric)) {
    return '—'
  }

  return new Intl.NumberFormat('pt-PT', {
    currency: 'EUR',
    style: 'currency',
  }).format(numeric)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getStatusTone(statusName) {
  const normalized = String(statusName || '').trim().toLowerCase()

  if (normalized.includes('pend')) {
    return 'warning'
  }

  if (normalized.includes('rejeit') || normalized.includes('reject')) {
    return 'danger'
  }

  if (normalized.includes('aprov') || normalized.includes('approved') || normalized.includes('active')) {
    return 'success'
  }

  return 'neutral'
}

function getStatusLabel(listing) {
  const normalized = String(listing?.status?.statusName || '').trim().toLowerCase()

  if (!normalized) {
    return listing?.isActive ? 'Ativo' : 'Inativo'
  }

  if (normalized.includes('pend')) {
    return 'Pendente'
  }

  if (normalized.includes('rejeit') || normalized.includes('reject')) {
    return 'Rejeitado'
  }

  if (normalized.includes('remov') || normalized.includes('hidden')) {
    return 'Removido'
  }

  if (normalized.includes('aprov') || normalized.includes('approved') || normalized.includes('active')) {
    return 'Aprovado'
  }

  if (normalized.includes('inactive')) {
    return 'Inativo'
  }

  return listing?.isActive ? 'Ativo' : 'Inativo'
}

function statusMatchesFilter(listing, statusFilter) {
  if (statusFilter === 'all') {
    return true
  }

  const statusName = String(listing?.status?.statusName || '').trim().toLowerCase()

  if (statusFilter === 'pending') {
    return statusName.includes('pend')
  }

  if (statusFilter === 'approved') {
    return statusName.includes('aprov') || statusName.includes('approved') || statusName.includes('active')
  }

  if (statusFilter === 'rejected') {
    return statusName.includes('rejeit') || statusName.includes('reject')
  }

  if (statusFilter === 'removed') {
    return statusName.includes('remov') || statusName.includes('hidden') || statusName.includes('inactive')
  }

  return true
}

function marketplaceSearchText(listing) {
  return [
    listing?.title,
    listing?.description,
    listing?.location,
    listing?.category?.categoryName,
    listing?.seller?.firstName,
    listing?.seller?.lastName,
    listing?.seller?.email,
    listing?.status?.statusName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function MarketplaceListingActionsMenu({
  listing,
  isApproved,
  onView,
  onApprove,
  onReject,
  onDelete,
  submittingAction,
}) {
  const [open, setOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const panelWidth = 192
    const gap = 8
    const viewportPadding = 12
    const left = Math.min(
      Math.max(rect.right - panelWidth, viewportPadding),
      window.innerWidth - panelWidth - viewportPadding,
    )

    setPanelPosition({
      left,
      top: rect.bottom + gap,
    })
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    updatePanelPosition()

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleViewportChange = () => updatePanelPosition()

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open, updatePanelPosition])

  const closeMenu = () => setOpen(false)

  return (
    <div className="marketplace-row-actions-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="moderation-action-btn neutral marketplace-row-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Abrir ações para ${listing.title || 'anúncio'}`}
        onClick={() => setOpen((current) => !current)}
      >
        ⋯
      </button>

      {open ? (
        <div
          className="marketplace-row-actions-panel"
          role="menu"
          aria-label="Ações do anúncio"
          style={panelPosition ? { left: panelPosition.left, top: panelPosition.top } : undefined}
        >
          <button
            type="button"
            className="marketplace-row-actions-item"
            role="menuitem"
            onClick={() => {
              closeMenu()
              onView(listing)
            }}
          >
            Ver detalhe
          </button>

          <button
            type="button"
            className="marketplace-row-actions-item"
            role="menuitem"
            disabled={submittingAction === 'approve' || isApproved}
            onClick={() => {
              closeMenu()
              onApprove(listing)
            }}
          >
            {isApproved ? 'Já aprovado' : 'Aprovar'}
          </button>

          <button
            type="button"
            className="marketplace-row-actions-item"
            role="menuitem"
            disabled={submittingAction === 'reject'}
            onClick={() => {
              closeMenu()
              onReject(listing)
            }}
          >
            Rejeitar
          </button>

          <button
            type="button"
            className="marketplace-row-actions-item marketplace-row-actions-item--danger"
            role="menuitem"
            disabled={submittingAction === 'delete'}
            onClick={() => {
              closeMenu()
              onDelete(listing)
            }}
          >
            Apagar
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function MarketplaceModerationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const reasonRef = useRef(null)

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [selectedListing, setSelectedListing] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejectMode, setIsRejectMode] = useState(false)
  const [modalImageFailed, setModalImageFailed] = useState(false)
  const [submittingAction, setSubmittingAction] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    status: 'all',
  })

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Utilizador'
  const sidebarActivePath = location.pathname
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : '']
    .filter(Boolean)
    .join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : '']
    .filter(Boolean)
    .join(' ')
  const sidebarToggleSymbol = isMobile
    ? mobileOpen ? '✕' : '☰'
    : sidebarCollapsed ? '▶' : '◀'
  const sidebarToggleLabel = isMobile
    ? mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'
    : sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral'

  const loadListings = useCallback(async () => {
    setLoading(true)
    setLoadingError('')

    try {
      const payload = await adminMarketplaceService.listListings()
      setListings(Array.isArray(payload) ? payload : [])
    } catch (requestError) {
      setLoadingError(localizeApiError(requestError, 'Não foi possível carregar os anúncios do marketplace.'))
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadListings()
  }, [loadListings])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')

    const updateLayout = () => {
      setIsMobile(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setMobileOpen(false)
      }
    }

    updateLayout()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateLayout)
      return () => mediaQuery.removeEventListener('change', updateLayout)
    }

    mediaQuery.addListener(updateLayout)
    return () => mediaQuery.removeListener(updateLayout)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')

    return () => {
      document.body.classList.remove('studio-page')
    }
  }, [])

  useEffect(() => {
    if (isModalOpen && selectedListing && isRejectMode) {
      reasonRef.current?.focus?.()
    }
  }, [isModalOpen, isRejectMode, selectedListing])

  const filteredListings = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const locationTerm = filters.location.trim().toLowerCase()
    const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
    const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)

    return listings.filter((listing) => {
      if (!statusMatchesFilter(listing, filters.status)) {
        return false
      }

      if (search && !marketplaceSearchText(listing).includes(search)) {
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

  const counts = useMemo(() => {
    const summary = { all: listings.length, pending: 0, approved: 0, rejected: 0, removed: 0 }

    for (const listing of listings) {
      const statusName = String(listing?.status?.statusName || '').trim().toLowerCase()

      if (statusName.includes('pend')) {
        summary.pending += 1
      } else if (statusName.includes('rejeit') || statusName.includes('reject')) {
        summary.rejected += 1
      } else if (statusName.includes('remov') || statusName.includes('inactive') || statusName.includes('hidden')) {
        summary.removed += 1
      } else if (statusName.includes('aprov') || statusName.includes('approved') || statusName.includes('active')) {
        summary.approved += 1
      }
    }

    return summary
  }, [listings])

  const selectedStatusTone = getStatusTone(selectedListing?.status?.statusName)
  const selectedListingPhotoUrl = useMemo(() => resolveMarketplacePhotoUrl(selectedListing?.photoUrl), [selectedListing?.photoUrl])
  const selectedIsApproved = selectedStatusTone === 'success'

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const openListing = (listing, shouldSelectReject = false) => {
    setSelectedListing(listing)
    setRejectionReason(listing?.rejectionReason || '')
    setIsRejectMode(Boolean(shouldSelectReject))
    setModalImageFailed(false)
    setIsModalOpen(true)

    if (shouldSelectReject) {
      setTimeout(() => {
        reasonRef.current?.focus?.()
      }, 0)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedListing(null)
    setRejectionReason('')
    setIsRejectMode(false)
    setModalImageFailed(false)
  }

  async function handleModeration(action, listing, payloadReason = '') {
    if (!listing || submittingAction) {
      return
    }

    setSubmittingAction(action)
    setError('')
    setNotice('')

    try {
      if (action === 'approve') {
        await adminMarketplaceService.approveListing(listing.listingId)
        setNotice(`Anúncio "${listing.title}" aprovado.`)
      } else if (action === 'reject') {
        const reason = String(payloadReason || '').trim()

        if (!reason) {
          setError('Indica um motivo de rejeição antes de continuar.')
          reasonRef.current?.focus?.()
          return
        }

        await adminMarketplaceService.rejectListing(listing.listingId, reason)
        setNotice(`Anúncio "${listing.title}" rejeitado.`)
      } else if (action === 'delete') {
        const confirmed = window.confirm(`Eliminar o anúncio "${listing.title}"?`)

        if (!confirmed) {
          return
        }

        await adminMarketplaceService.deleteListing(listing.listingId)
        setNotice(`Anúncio "${listing.title}" removido.`)
      }

      closeModal()
      await loadListings()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível concluir a ação de moderação.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleLogout(event) {
    event.preventDefault()

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileOpen((currentValue) => !currentValue)
      return
    }

    setSidebarCollapsed((currentValue) => !currentValue)
  }

  const handleMobileNavClick = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  return (
    <div className={`admin-marketplace-moderation ${appShellClassName}`}>
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
            <p>{displayName}</p>
          </div>
        </div>

        <div className="nav-group">
          <h2>Gestão</h2>

          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${sidebarActivePath === item.href ? ' active' : ''}`}
              to={item.href}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}

          <a className="nav-link" href="/login" title={`Terminar sessão de ${displayName}`} onClick={handleLogout}>
            Terminar Sessão
          </a>
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
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <h2>Moderação do Marketplace</h2>
            </div>
          </div>

          <div className="topbar-right">
            <span className="pill">{counts.pending} pendentes</span>
            <NotificationsBell pageLink="/admin/notifications" />
          </div>
        </header>

        <section className="content-grid" style={{ gap: '1rem' }}>
          <div className="kpi-grid">
            <article className="kpi">
              <h3>Todos</h3>
              <strong>{counts.all}</strong>
            </article>
            <article className="kpi">
              <h3>Pendentes</h3>
              <strong>{counts.pending}</strong>
            </article>
            <article className="kpi">
              <h3>Aprovados</h3>
              <strong>{counts.approved}</strong>
            </article>
            <article className="kpi">
              <h3>Rejeitados</h3>
              <strong>{counts.rejected}</strong>
            </article>
          </div>

          {notice ? (
            <div className="soft-box" role="status" aria-live="polite">
              {notice}
            </div>
          ) : null}

          {loadingError ? (
            <div className="soft-box error" role="alert">
              {loadingError}
            </div>
          ) : null}

          {error ? (
            <div className="soft-box error" role="alert">
              {error}
            </div>
          ) : null}

          <article className="panel">
            <div className="panel-header">
              <h3>Feed e queue de moderação</h3>
              <button type="button" className="ghost-btn" onClick={() => void loadListings()}>
                Atualizar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Input
                label="Pesquisar"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Título, descrição, vendedor ou estado"
              />

              <Input
                label="Localização"
                value={filters.location}
                onChange={(event) => updateFilter('location', event.target.value)}
                placeholder="Ex.: Viana do Castelo"
              />

              <Input
                label="Preço mínimo"
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(event) => updateFilter('minPrice', event.target.value)}
                placeholder="0"
              />

              <Input
                label="Preço máximo"
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(event) => updateFilter('maxPrice', event.target.value)}
                placeholder="100"
              />
            </div>

            <div className="marketplace-status-tabs">
              {statusOptions.map((option) => {
                const active = filters.status === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={active ? 'marketplace-status-pill active' : 'marketplace-status-pill'}
                    onClick={() => updateFilter('status', option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              {loading ? (
                <div className="soft-box">A carregar anúncios...</div>
              ) : (
                <Table
                  columns={[
                    {
                      verticalAlign: 'middle',
                      header: 'Anúncio',
                      key: 'title',
                      render: (listing) => (
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <strong>{listing.title || 'Sem título'}</strong>
                          <span style={{ color: 'var(--studio-muted)', fontSize: '0.85rem' }}>
                            {listing.category?.categoryName || 'Categoria geral'} · {formatDateTime(listing.createdAt)}
                          </span>
                        </div>
                      ),
                    },
                    {
                      verticalAlign: 'middle',
                      header: 'Vendedor',
                      key: 'seller',
                      render: (listing) => (
                        <div style={{ display: 'grid', gap: '0.2rem' }}>
                          <strong>{[listing.seller?.firstName, listing.seller?.lastName].filter(Boolean).join(' ') || '—'}</strong>
                          <span style={{ color: 'var(--studio-muted)', fontSize: '0.85rem' }}>
                            {listing.seller?.email || '—'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      verticalAlign: 'middle',
                      header: 'Preço',
                      key: 'price',
                      align: 'right',
                      render: (listing) => formatMoney(listing.price),
                    },
                    {
                      verticalAlign: 'middle',
                      header: 'Localização',
                      key: 'location',
                      render: (listing) => listing.location || '—',
                    },
                    {
                      verticalAlign: 'middle',
                      header: 'Estado',
                      key: 'status',
                      render: (listing) => (
                        <Badge variant={getStatusTone(listing.status?.statusName)}>
                          {getStatusLabel(listing)}
                        </Badge>
                      ),
                    },
                  ]}
                  rows={filteredListings}
                  getRowKey={(listing) => listing.listingId}
                  emptyState="Não existem anúncios com os filtros atuais."
                  rowActionsVerticalAlign="middle"
                  renderRowActions={(listing) => (
                    <WithRole roles={['admin']}>
                      <MarketplaceListingActionsMenu
                        listing={listing}
                        isApproved={getStatusTone(listing.status?.statusName) === 'success'}
                        submittingAction={submittingAction}
                        onView={openListing}
                        onApprove={(item) => void handleModeration('approve', item)}
                        onReject={(item) => openListing(item, true)}
                        onDelete={(item) => void handleModeration('delete', item)}
                      />
                    </WithRole>
                  )}
                />
              )}
            </div>
          </article>
        </section>
      </main>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={selectedListing?.title || 'Detalhe do anúncio'}
        size="xl"
        footer={
          <WithRole roles={['admin']}>
            <div className="marketplace-modal-footer-actions">
              <button
                type="button"
                className="moderation-action-btn approve"
                disabled={submittingAction === 'approve' || selectedIsApproved}
                onClick={() => void handleModeration('approve', selectedListing)}
              >
                {selectedIsApproved ? 'Já aprovado' : 'Aprovar anúncio'}
              </button>
              {isRejectMode ? (
                <button
                  type="button"
                  className="moderation-action-btn reject"
                  disabled={submittingAction === 'reject'}
                  onClick={() => void handleModeration('reject', selectedListing, rejectionReason)}
                >
                  Confirmar rejeição
                </button>
              ) : (
                <button
                  type="button"
                  className="moderation-action-btn reject"
                  disabled={submittingAction === 'reject'}
                  onClick={() => setIsRejectMode(true)}
                >
                  Rejeitar anúncio
                </button>
              )}
              <button
                type="button"
                className="moderation-action-btn delete"
                disabled={submittingAction === 'delete'}
                onClick={() => void handleModeration('delete', selectedListing)}
              >
                Apagar
              </button>
            </div>
          </WithRole>
        }
      >
        <div className="marketplace-preview-grid">
          <div className="marketplace-modal-main-column">
            {selectedListingPhotoUrl && !modalImageFailed ? (
              <img
                src={selectedListingPhotoUrl}
                alt={selectedListing.title || 'Anúncio'}
                className="marketplace-modal-image"
                onError={() => setModalImageFailed(true)}
              />
            ) : (
              <div className="marketplace-modal-image-empty">
                Sem imagem
              </div>
            )}

            <div className="marketplace-modal-meta-block">
              <div className="marketplace-modal-meta-head">
                <Badge variant={selectedStatusTone}>{getStatusLabel(selectedListing)}</Badge>
                <span className="marketplace-modal-price">{formatMoney(selectedListing?.price)}</span>
              </div>

              <p className="marketplace-modal-description">{selectedListing?.description || 'Sem descrição adicional.'}</p>

              {selectedListing?.rejectionReason ? (
                <div className="soft-box error marketplace-modal-registered-reason">
                  <strong>Motivo registado:</strong> {selectedListing.rejectionReason}
                </div>
              ) : null}
            </div>
          </div>

          <div className="marketplace-modal-side-column">
            <div className="soft-box">
              <strong>Vendedor</strong>
              <p className="marketplace-modal-line-first">
                {[selectedListing?.seller?.firstName, selectedListing?.seller?.lastName].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="marketplace-modal-line-subtle">
                {selectedListing?.seller?.email || '—'}
              </p>
              <p className="marketplace-modal-line-subtle">
                {selectedListing?.seller?.phoneNumber || '—'}
              </p>
            </div>

            <div className="soft-box">
              <strong>Detalhes do anúncio</strong>
              <p className="marketplace-modal-line-first">
                Categoria: {selectedListing?.category?.categoryName || '—'}
              </p>
              <p className="marketplace-modal-line-regular">
                Estado: {selectedListing?.condition?.conditionName || '—'}
              </p>
              <p className="marketplace-modal-line-regular">
                Localização: {selectedListing?.location || '—'}
              </p>
              <p className="marketplace-modal-line-regular">
                Publicado: {formatDateTime(selectedListing?.createdAt)}
              </p>
            </div>

            {isRejectMode ? (
              <label className="marketplace-rejection-panel">
                <span className="marketplace-rejection-title">Motivo da rejeição</span>
                <textarea
                  ref={reasonRef}
                  rows={5}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Descreve claramente o motivo para rejeitar este anúncio"
                />
                <span className="marketplace-rejection-help">Obrigatório para confirmar rejeição.</span>
              </label>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
