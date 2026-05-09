import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import notificationPreviewService from '../../services/notificationPreviewService'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import InventoryItemCard from '../../components/InventoryItemCard'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import {
  createInventoryRental,
  listInventoryItems,
  listInventoryRentals,
} from '../../services/inventory'
import '../student/inventory.css'
import './InventoryPage.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Pedidos de admissão', href: '/teacher/admission-requests' },
  { label: 'Inventário da Escola', href: '/teacher/inventory' },
]

const PAYMENT_METHOD_OPTIONS = [
  { id: 1, label: 'MB Way' },
  { id: 2, label: 'Cartão' },
  { id: 3, label: 'Referência Multibanco' },
]

const RENTAL_STATUS_BADGE = {
  pending: { variant: 'warning', label: 'A aguardar direção' },
  pending_validation: { variant: 'warning', label: 'A aguardar direção' },
  'condition-checked': { variant: 'info', label: 'Condição verificada' },
  'return-verified': { variant: 'info', label: 'Devolução verificada' },
  completed: { variant: 'success', label: 'Concluído' },
  rejected: { variant: 'danger', label: 'Rejeitado' },
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-PT', { currency: 'EUR', style: 'currency' }).format(Number(value))
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

function formatNotificationDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function toIsoDate(dateString) {
  if (!dateString) return null
  return `${dateString}T00:00:00.000Z`
}

function normalizeItem(item) {
  return { ...item, conditionLabel: item?.conditionLabel || 'Verificado' }
}

export default function TeacherInventoryPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [activeTab, setActiveTab] = useState('items')
  const [items, setItems] = useState([])
  const [rentals, setRentals] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingRentals, setLoadingRentals] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availability, setAvailability] = useState('all')

  const [rentalModal, setRentalModal] = useState({ open: false, item: null })
  const [rentalForm, setRentalForm] = useState({ startDate: '', endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
  const [submittingRental, setSubmittingRental] = useState(false)
  const [rentalError, setRentalError] = useState('')

  const [detailModal, setDetailModal] = useState({ open: false, item: null })

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  const notificationBoxRef = useRef(null)

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const sidebarToggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) { setMobileOpen((v) => !v); return }
    setSidebarCollapsed((v) => !v)
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => { if (isMobile) setMobileOpen(false) }, [isMobile])

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

  const loadItems = useCallback(async () => {
    try {
      setLoadingItems(true)
      setError('')
      const data = await listInventoryItems({ onlyAvailable: false })
      setItems(data.map(normalizeItem))
    } catch (err) {
      setItems([])
      setError(err?.response?.data?.error || 'Não foi possível carregar o inventário.')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  const loadRentals = useCallback(async () => {
    try {
      setLoadingRentals(true)
      const data = await listInventoryRentals()
      setRentals(data)
    } catch (err) {
      setRentals([])
      setError((prev) => prev || err?.response?.data?.error || 'Não foi possível carregar as reservas.')
    } finally {
      setLoadingRentals(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])
  useEffect(() => { loadRentals() }, [loadRentals])

  const refreshNotificationSummary = useCallback(async () => {
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
      setNotificationUnreadCount(preview.unreadCount)
    } catch {
      // ignore preview fetch errors silently
    }
  }, [])

  const loadNotificationPreview = useCallback(async () => {
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items)
      setNotificationUnreadCount(preview.unreadCount)
      setNotificationsLoaded(true)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => { void refreshNotificationSummary() }, [refreshNotificationSummary])

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const handleOutsideClick = (event) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notificationsOpen])

  const handleNotificationsClick = useCallback(() => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && !notificationsLoaded) void loadNotificationPreview()
  }, [loadNotificationPreview, notificationsLoaded, notificationsOpen])

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
      await Promise.all([loadItems(), loadRentals()])
      setActiveTab('myRentals')
    } catch (err) {
      setRentalError(err?.response?.data?.error || err?.response?.data?.message || 'Não foi possível criar a reserva.')
    } finally {
      setSubmittingRental(false)
    }
  }

  const rentalColumns = [
    {
      key: 'reference',
      header: 'Referência',
      render: (row) => row.reference ?? `#${row.rentalId}`,
    },
    {
      key: 'item',
      header: 'Item',
      render: (row) => row.item?.itemName ?? '—',
    },
    {
      key: 'paymentMethod',
      header: 'Método de pagamento',
      render: (row) => row.paymentMethod?.label ?? row.paymentMethodName ?? '—',
    },
    {
      key: 'estimatedTotal',
      header: 'Preço a pagar',
      align: 'right',
      render: (row) => formatCurrency(row.estimatedTotal ?? row.symbolicFee),
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
  ]

  return (
    <div className="teacher-inventory inventory-page">
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
              <p>{displayName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  to={item.href}
                  onClick={handleMobileNavClick}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              className="nav-link"
              type="button"
              onClick={async () => { await logout(); navigate('/login', { replace: true }) }}
            >
              Terminar Sessão
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
                  onClick={handleSidebarToggle}
                >
                  {sidebarToggleSymbol}
                </button>
                <h2>Inventário da Escola</h2>
              </div>
              <p>Catálogo oficial para pedidos de aluguer. A admin aprova ou rejeita e o pagamento é feito na escola.</p>
            </div>

            <div className="topbar-right" ref={notificationBoxRef}>
              <button
                type="button"
                className="pill"
                onClick={() => setActiveTab('myRentals')}
              >
                Pedidos ({rentals.length})
              </button>
              <button
                type="button"
                className="pill notifications-pill"
                onClick={handleNotificationsClick}
              >
                Notificações {notificationUnreadCount > 0 ? notificationUnreadCount : ''}
              </button>

              {notificationsOpen ? (
                <div className="notifications-popover">
                  <div className="notifications-popover-header">
                    <strong>Notificações</strong>
                  </div>
                  {notificationsLoading ? <p className="notifications-state">A carregar...</p> : null}
                  {!notificationsLoading && notificationsError ? (
                    <p className="notifications-state error">{notificationsError}</p>
                  ) : null}
                  {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                    <p className="notifications-state">Sem notificações.</p>
                  ) : null}
                  {!notificationsLoading && notifications.length > 0 ? (
                    <ul className="notifications-list">
                      {notifications.map((n) => (
                        <li key={n.id} className="notifications-item">
                          <strong>{n.title}</strong>
                          {n.message ? <p>{n.message}</p> : null}
                          <small>{formatNotificationDate(n.createdAt)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link to="/teacher/notifications" className="notifications-more-link" onClick={() => setNotificationsOpen(false)}>
                    Ver Mais
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <section className="content-grid">
            {error ? (
              <div className="inventory-error-banner">
                {error}
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ marginLeft: '0.65rem' }}
                  onClick={() => { loadItems(); loadRentals() }}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}

            <div className="panel">
              <div className="tab-row">
                <button
                  type="button"
                  className={`tab-btn${activeTab === 'items' ? ' active' : ''}`}
                  onClick={() => setActiveTab('items')}
                >
                  Catálogo oficial
                </button>
                <button
                  type="button"
                  className={`tab-btn${activeTab === 'myRentals' ? ' active' : ''}`}
                  onClick={() => setActiveTab('myRentals')}
                >
                  Os meus pedidos ({rentals.length})
                </button>
              </div>

              {activeTab === 'items' ? (
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

                    {loadingItems ? (
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
              ) : null}

              {activeTab === 'myRentals' ? (
                <>
                  {loadingRentals ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <LoadingSkeleton variant="block" height="3rem" />
                      <LoadingSkeleton variant="block" height="8rem" />
                    </div>
                  ) : (
                    <Table
                      columns={rentalColumns}
                      rows={rentals}
                      getRowKey={(row) => row.rentalId}
                      emptyState="Ainda não tens pedidos de aluguer."
                      striped
                    />
                  )}
                </>
              ) : null}
            </div>
          </section>
        </main>
      </div>

      {/* Modal: Alugar */}
      <Modal
        open={rentalModal.open}
        title={rentalModal.item ? `Alugar "${rentalModal.item.itemName}"` : 'Alugar artigo'}
        description="Seleciona o período de aluguer e o método de pagamento."
        size="md"
        className="teacher-inventory-modal"
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
        className="teacher-inventory-modal"
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
    </div>
  )
}
