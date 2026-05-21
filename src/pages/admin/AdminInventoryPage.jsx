import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationsBell from '../../components/NotificationsBell'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import WithRole from '../../components/WithRole'
import { useAuth } from '../../hooks/useAuth'
import {
  createInventoryItem,
  deleteInventoryItem,
  listAdminInventoryItems,
  listAdminInventoryRentals,
  approveInventoryRental,
  updateInventoryItem,
  verifyInventoryReturn,
  rejectInventoryReturn,
} from '../../services/inventory'
import { resolveMarketplacePhotoUrl } from '../../utils/marketplace-photo-url'
import '../admin-studios.css'
import './marketplace-moderation.css'
import './admin-inventory.css'
import { ADMIN_NAV_ITEMS as navigationItems } from './adminNav'
import { localizeApiError } from '../../utils/apiErrors'

const itemStatusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponíveis' },
  { value: 'reserved', label: 'Reservados' },
]

const initialItemForm = {
  itemName: '',
  categoryId: '',
  categoryName: '',
  symbolicFee: '',
  totalQuantity: '1',
  description: '',
  photoUrl: '',
}

const initialReturnForm = {
  conditionStatus: 'good',
  conditionNotes: '',
}

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

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return parsed.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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

function normalizeRentalCondition(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'good' || normalized === 'damaged' || normalized === 'lost') {
    return normalized
  }

  return 'good'
}

function getItemStatusTone(status) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized.includes('available')) {
    return 'success'
  }

  if (normalized.includes('reserved') || normalized.includes('rented')) {
    return 'warning'
  }

  return 'neutral'
}

function getItemStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized.includes('available')) {
    return 'Disponível'
  }

  if (normalized.includes('reserved') || normalized.includes('rented')) {
    return 'Reservado'
  }

  return 'Sem estado'
}

function getRentalStatusTone(status) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized.includes('completed') || normalized.includes('verified') || normalized.includes('approved')) {
    return 'success'
  }

  if (normalized.includes('condition')) {
    return 'info'
  }

  if (normalized.includes('awaiting') || normalized.includes('pending')) {
    return 'warning'
  }

  return 'neutral'
}

function getRentalStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized.includes('completed')) {
    return 'Concluído'
  }

  if (normalized.includes('return-verified')) {
    return 'Devolução verificada'
  }

  if (normalized.includes('condition-checked')) {
    return 'Em validação'
  }

  if (normalized.includes('awaiting')) {
    return 'A aguardar aprovação'
  }

  if (normalized.includes('pending')) {
    return 'Pendente'
  }

  if (normalized.includes('approved')) {
    return 'Aprovado'
  }

  if (normalized.includes('rejected')) {
    return 'Rejeitado'
  }

  return 'Ativo'
}

function toInventorySearchText(item) {
  return [
    item?.itemName,
    item?.description,
    item?.category?.categoryName,
    item?.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function toItemForm(item) {
  return {
    itemName: item?.itemName || '',
    categoryId: item?.category?.categoryId ? String(item.category.categoryId) : '',
    categoryName: '',
    symbolicFee: item?.symbolicFee !== null && item?.symbolicFee !== undefined ? String(item.symbolicFee) : '',
    totalQuantity: item?.totalQuantity !== null && item?.totalQuantity !== undefined ? String(item.totalQuantity) : '1',
    description: item?.description || '',
    photoUrl: item?.photoUrl || '',
  }
}

export default function AdminInventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [items, setItems] = useState([])
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [submittingAction, setSubmittingAction] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    categoryId: 'all',
    minFee: '',
    maxFee: '',
    status: 'all',
  })

  const [selectedItem, setSelectedItem] = useState(null)
  const [itemModalMode, setItemModalMode] = useState('view')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemForm, setItemForm] = useState(initialItemForm)
  const [itemFile, setItemFile] = useState(null)
  const [itemFilePreviewUrl, setItemFilePreviewUrl] = useState('')
  const [itemImageFailed, setItemImageFailed] = useState(false)

  const [selectedRental, setSelectedRental] = useState(null)
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false)
  const [returnForm, setReturnForm] = useState(initialReturnForm)

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

  const loadInventory = useCallback(async () => {
    setLoading(true)
    setLoadingError('')

    try {
      const [nextRentals, nextItems] = await Promise.all([
        listAdminInventoryRentals(),
        listAdminInventoryItems(),
      ])

      setRentals(Array.isArray(nextRentals) ? nextRentals : [])
      setItems(Array.isArray(nextItems) ? nextItems : [])
    } catch (requestError) {
      setLoadingError(localizeApiError(requestError, 'Não foi possível carregar os dados do inventário.'))
      setRentals([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

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

  useEffect(() => () => {
    if (itemFilePreviewUrl) {
      URL.revokeObjectURL(itemFilePreviewUrl)
    }
  }, [itemFilePreviewUrl])

  const categoryOptions = useMemo(() => {
    const byId = new Map()

    for (const item of items) {
      const categoryId = item?.category?.categoryId
      const categoryName = String(item?.category?.categoryName || '').trim()

      if (!categoryId || !categoryName) {
        continue
      }

      byId.set(categoryId, categoryName)
    }

    return Array.from(byId.entries())
      .map(([categoryId, categoryName]) => ({ categoryId, categoryName }))
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName, 'pt-PT'))
  }, [items])
  const hasCategoryOptions = categoryOptions.length > 0

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const minFee = filters.minFee === '' ? null : Number(filters.minFee)
    const maxFee = filters.maxFee === '' ? null : Number(filters.maxFee)

    return items.filter((item) => {
      if (filters.status !== 'all' && String(item.status || '').toLowerCase() !== filters.status) {
        return false
      }

      if (filters.categoryId !== 'all' && Number(item?.category?.categoryId) !== Number(filters.categoryId)) {
        return false
      }

      if (search && !toInventorySearchText(item).includes(search)) {
        return false
      }

      if (minFee !== null && Number(item.symbolicFee) < minFee) {
        return false
      }

      if (maxFee !== null && Number(item.symbolicFee) > maxFee) {
        return false
      }

      return true
    })
  }, [filters, items])

  const metrics = useMemo(() => {
    const summary = {
      allItems: items.length,
      availableUnits: 0,
      reservedUnits: 0,
      rentalsActive: rentals.length,
      availableItems: 0,
      reservedItems: 0,
    }

    for (const item of items) {
      summary.availableUnits += Number(item.availableQuantity || 0)
      summary.reservedUnits += Number(item.reservedQuantity || 0)

      if (String(item.status || '').toLowerCase() === 'available') {
        summary.availableItems += 1
      } else {
        summary.reservedItems += 1
      }
    }

    return summary
  }, [items, rentals.length])

  const selectedItemPhotoUrl = useMemo(() => {
    if (itemFilePreviewUrl) {
      return itemFilePreviewUrl
    }

    const rawValue = itemModalMode === 'view'
      ? selectedItem?.photoUrl
      : itemForm.photoUrl || selectedItem?.photoUrl

    return resolveMarketplacePhotoUrl(rawValue)
  }, [itemFilePreviewUrl, itemForm.photoUrl, itemModalMode, selectedItem?.photoUrl])

  const selectedItemStatusTone = getItemStatusTone(selectedItem?.status)
  const selectedRentalStatusTone = getRentalStatusTone(selectedRental?.status)

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateItemForm = (field, value) => {
    setItemForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const closeItemModal = () => {
    setIsItemModalOpen(false)
    setSelectedItem(null)
    setItemModalMode('view')
    setItemForm(initialItemForm)
    setItemFile(null)
    setItemImageFailed(false)

    setItemFilePreviewUrl((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return ''
    })
  }

  const openCreateModal = () => {
    const defaultCategoryId = categoryOptions[0]?.categoryId ? String(categoryOptions[0].categoryId) : '__new__'

    setSelectedItem(null)
    setItemModalMode('create')
    setItemForm({
      ...initialItemForm,
      categoryId: defaultCategoryId,
    })
    setItemFile(null)
    setItemImageFailed(false)

    setItemFilePreviewUrl((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return ''
    })

    setIsItemModalOpen(true)
  }

  const openViewItemModal = (item) => {
    setSelectedItem(item)
    setItemModalMode('view')
    setItemForm(toItemForm(item))
    setItemFile(null)
    setItemImageFailed(false)

    setItemFilePreviewUrl((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return ''
    })

    setIsItemModalOpen(true)
  }

  const openEditItemModal = (item) => {
    setSelectedItem(item)
    setItemModalMode('edit')
    setItemForm(toItemForm(item))
    setItemFile(null)
    setItemImageFailed(false)

    setItemFilePreviewUrl((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return ''
    })

    setIsItemModalOpen(true)
  }

  const openRentalModal = (rental) => {
    setSelectedRental(rental)
    setReturnForm({
      conditionStatus: normalizeRentalCondition(rental?.returnVerification?.conditionStatus),
      conditionNotes: rental?.returnVerification?.conditionNotes || '',
    })
    setIsRentalModalOpen(true)
  }

  const closeRentalModal = () => {
    setSelectedRental(null)
    setReturnForm(initialReturnForm)
    setIsRentalModalOpen(false)
  }

  async function handleSaveItem() {
    if (submittingAction) {
      return
    }

    const itemName = itemForm.itemName.trim()
    const isCreatingCategory = itemForm.categoryId === '__new__'
    const categoryId = Number(itemForm.categoryId)
    const categoryName = itemForm.categoryName.trim()
    const symbolicFee = Number(itemForm.symbolicFee)
    const totalQuantity = Number(itemForm.totalQuantity)
    const description = itemForm.description.trim()
    const photoUrl = itemForm.photoUrl.trim()

    if (!itemName) {
      setError('Indica o nome do artigo.')
      return
    }

    if (!isCreatingCategory && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      setError('Seleciona uma categoria válida.')
      return
    }

    if (isCreatingCategory && categoryName.length === 0) {
      setError('Indica o nome da nova categoria.')
      return
    }

    if (Number.isNaN(symbolicFee) || symbolicFee < 0) {
      setError('Indica uma taxa simbólica válida.')
      return
    }

    if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
      setError('A quantidade total tem de ser igual ou superior a 1.')
      return
    }

    setSubmittingAction('save-item')
    setError('')
    setNotice('')

    try {
      const payload = {
        itemName,
        ...(isCreatingCategory ? { categoryName } : { categoryId }),
        symbolicFee,
        totalQuantity,
        description,
        photoUrl,
      }

      if (itemModalMode === 'create') {
        const created = await createInventoryItem(payload, itemFile)
        setNotice(`Artigo "${created?.itemName || itemName}" criado com sucesso.`)
      } else if (selectedItem?.itemId) {
        const updated = await updateInventoryItem(selectedItem.itemId, payload, itemFile)
        setNotice(`Artigo "${updated?.itemName || itemName}" atualizado com sucesso.`)
      }

      closeItemModal()
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível guardar o artigo do inventário.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleDeleteItem(item) {
    if (submittingAction) {
      return
    }

    const confirmed = window.confirm(`Remover o artigo "${item.itemName}" do inventário?`)

    if (!confirmed) {
      return
    }

    setSubmittingAction('delete-item')
    setError('')
    setNotice('')

    try {
      await deleteInventoryItem(item.itemId)
      setNotice(`Artigo "${item.itemName}" removido com sucesso.`)
      closeItemModal()
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível remover o artigo.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleVerifyReturn() {
    if (!selectedRental?.rentalId || submittingAction) {
      return
    }

    setSubmittingAction('verify-return')
    setError('')
    setNotice('')

    try {
      await verifyInventoryReturn(selectedRental.rentalId, {
        returnDate: new Date().toISOString(),
        conditionStatus: returnForm.conditionStatus,
        conditionNotes: returnForm.conditionNotes.trim() || null,
      })

      setNotice(`Devolução ${selectedRental.reference} verificada com sucesso.`)
      closeRentalModal()
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível validar a devolução.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleRejectReturn() {
    if (!selectedRental?.rentalId || submittingAction) {
      return
    }

    // Only allow rejection while the rental is still pending (no verification performed)
    if (selectedRental?.status !== 'pending') {
      setError('Só é possível rejeitar devoluções pendentes.')
      return
    }

    setSubmittingAction('reject-return')
    setError('')
    setNotice('')

    try {
      await rejectInventoryReturn(selectedRental.rentalId, {
        returnDate: new Date().toISOString(),
        conditionStatus: returnForm.conditionStatus,
        conditionNotes: returnForm.conditionNotes.trim() || null,
      })

      const adminName = auth?.user?.firstName || ''
      setNotice(`Devolução ${selectedRental.reference} rejeitada por ${adminName}.`)
      closeRentalModal()
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível rejeitar a devolução.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleApproveRental(rental) {
    if (!rental?.rentalId || submittingAction) return

    const confirmed = window.confirm(`Aceitar pedido ${rental.reference}?`)
    if (!confirmed) return

    setSubmittingAction('approve-rental')
    setError('')
    setNotice('')

    try {
      await approveInventoryRental(rental.rentalId, { decision: 'approve', notes: '' })
      setNotice(`Pedido ${rental.reference} aprovado.`)
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível aprovar o pedido.'))
    } finally {
      setSubmittingAction('')
    }
  }

  async function handleAdminRejectRental(rental) {
    if (!rental?.rentalId || submittingAction) return

    const notes = window.prompt('Motivo / notas (opcional):')
    if (notes === null) return

    setSubmittingAction('approve-rental')
    setError('')
    setNotice('')

    try {
      await approveInventoryRental(rental.rentalId, { decision: 'reject', notes })
      setNotice(`Pedido ${rental.reference} rejeitado.`)
      await loadInventory()
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível rejeitar o pedido.'))
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
              <h2>Inventário da Escola</h2>
            </div>
          </div>

          <div className="topbar-right">
            <span className="pill">{metrics.rentalsActive} devoluções ativas</span>
            <NotificationsBell pageLink="/admin/notifications" />
          </div>
        </header>

        <section className="content-grid" style={{ gap: '1rem' }}>
          <div className="kpi-grid">
            <article className="kpi">
              <h3>Itens oficiais</h3>
              <strong >{metrics.allItems}</strong>
            </article>
            <article className="kpi">
              <h3>Unidades disponíveis</h3>
              <strong >{metrics.availableUnits}</strong>
            </article>
            <article className="kpi">
              <h3>Unidades reservadas</h3>
              <strong >{metrics.reservedUnits}</strong>
            </article>
            <article className="kpi">
              <h3>Devoluções por validar</h3>
              <strong >{metrics.rentalsActive}</strong>
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
              <h3>Catálogo oficial do inventário</h3>
              <div className="inventory-panel-actions">
                <button type="button" className="ghost-btn" onClick={() => void loadInventory()}>
                  Atualizar
                </button>
                <WithRole roles={['admin']}>
                  <button type="button" className="cta" onClick={openCreateModal}>
                    Novo item
                  </button>
                </WithRole>
              </div>
            </div>

            <div className="inventory-search-filters">
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    label="Pesquisar"
                    value={filters.search}
                    onChange={(event) => updateFilter('search', event.target.value)}
                    placeholder="Nome, descrição, categoria ou estado"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label>
                    Categoria
                    <select
                      value={filters.categoryId}
                      onChange={(event) => updateFilter('categoryId', event.target.value)}
                    >
                      <option value="all">Todas as categorias</option>
                      {categoryOptions.map((category) => (
                        <option key={category.categoryId} value={category.categoryId}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    label="Taxa mínima"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.minFee}
                    onChange={(event) => updateFilter('minFee', event.target.value)}
                    placeholder="0"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    label="Taxa máxima"
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.maxFee}
                    onChange={(event) => updateFilter('maxFee', event.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            <div className="inventory-status-tabs">
              {itemStatusOptions.map((option) => {
                const active = filters.status === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={active ? 'pill' : 'ghost-btn'}
                    onClick={() => updateFilter('status', option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              {loading ? (
                <div className="soft-box">A carregar catálogo oficial...</div>
              ) : (
                <Table
                  columns={[
                    {
                      header: 'Item',
                      key: 'itemName',
                      align: 'left',
                      verticalAlign: 'middle',
                      render: (item) => (
                        <div className="inventory-item-cell">
                          <strong>{item.itemName || 'Sem nome'}</strong>
                          <span>
                            {item.category?.categoryName || 'Sem categoria'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      header: 'Resultado',
                      key: 'result',
                      align: 'center',
                      verticalAlign: 'middle',
                      render: (rental) => {
                        const verification = rental.returnVerification || {}
                        if (verification.conditionStatus && verification.conditionVerified === false) {
                          return <Badge variant="danger">Rejeitado</Badge>
                        }
                        return null
                      },
                    },
                    {
                      header: 'Taxa simbólica',
                      key: 'symbolicFee',
                      align: 'right',
                      verticalAlign: 'middle',
                      render: (item) => formatMoney(item.symbolicFee),
                    },
                    {
                      header: 'Stock',
                      key: 'stock',
                      align: 'left',
                      verticalAlign: 'middle',
                      render: (item) => (
                        <div className="inventory-stock-stack">
                          <span>Disponível: <strong>{Number(item.availableQuantity || 0)}</strong></span>
                          <span>Reservado: <strong>{Number(item.reservedQuantity || 0)}</strong> · Total: <strong>{Number(item.totalQuantity || 0)}</strong></span>
                        </div>
                      ),
                    },
                    {
                      header: 'Estado',
                      key: 'status',
                      align: 'center',
                      verticalAlign: 'middle',
                      render: (item) => (
                        <div className="inventory-status-cell">
                          <Badge variant={getItemStatusTone(item.status)}>
                            {getItemStatusLabel(item.status)}
                          </Badge>
                        </div>
                      ),
                    },
                  ]}
                  rows={filteredItems}
                  getRowKey={(item) => item.itemId}
                  emptyState="Sem artigos para os filtros selecionados."
                  rowActionsVerticalAlign="middle"
                  rowActionsHeader="Ações"
                  renderRowActions={(item) => (
                    <WithRole roles={['admin']}>
                      <div className="marketplace-row-actions">
                        <button type="button" className="moderation-action-btn neutral" onClick={() => openViewItemModal(item)}>
                          Ver
                        </button>
                        <button type="button" className="moderation-action-btn approve" onClick={() => openEditItemModal(item)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="moderation-action-btn delete"
                          disabled={submittingAction === 'delete-item'}
                          onClick={() => void handleDeleteItem(item)}
                        >
                          Apagar
                        </button>
                      </div>
                    </WithRole>
                  )}
                />
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Devoluções ativas e validação</h3>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div className="soft-box">A carregar devoluções...</div>
              ) : (
                <Table
                  columns={[
                    {
                        header: 'Referência',
                        key: 'reference',
                        align: 'left',
                        verticalAlign: 'middle',
                        render: (rental) => (
                        <div className="inventory-item-cell">
                          <strong>{rental.reference}</strong>
                          <span>{formatDateTime(rental.startDate)}</span>
                        </div>
                      ),
                    },
                    {
                        header: 'Artigo',
                        key: 'item',
                        align: 'left',
                        verticalAlign: 'middle',
                        render: (rental) => (
                        <div className="inventory-item-cell">
                          <strong>{rental.item?.itemName || 'Artigo'}</strong>
                          <span>{formatMoney(rental.symbolicFee)}</span>
                        </div>
                      ),
                    },
                    {
                        header: 'Requisitante',
                        key: 'borrower',
                        align: 'left',
                        verticalAlign: 'middle',
                        render: (rental) => (
                        <div className="inventory-item-cell">
                          <strong>{[rental.borrower?.firstName, rental.borrower?.lastName].filter(Boolean).join(' ') || 'Utilizador'}</strong>
                          <span>{rental.borrower?.email || 'Sem email'}</span>
                        </div>
                      ),
                    },
                    {
                        header: 'Período',
                        key: 'period',
                        align: 'center',
                        verticalAlign: 'middle',
                        render: (rental) => `${formatDate(rental.startDate)} → ${formatDate(rental.endDate)}`,
                    },
                    {
                        header: 'Estado',
                        key: 'status',
                        align: 'center',
                        verticalAlign: 'middle',
                        render: (rental) => (
                        <Badge variant={getRentalStatusTone(rental.status)}>
                          {getRentalStatusLabel(rental.status)}
                        </Badge>
                      ),
                    },
                  ]}
                  rows={rentals}
                  getRowKey={(rental) => rental.rentalId}
                  emptyState="Sem devoluções pendentes de validação."
                    rowActionsHeader="Ações"
                    rowActionsVerticalAlign="middle"
                    renderRowActions={(rental) => (
                    <WithRole roles={['admin']}>
                      <div className="marketplace-row-actions">
                        {rental.status === 'awaiting-approval' && (
                          <>
                            <button
                              type="button"
                              className="moderation-action-btn approve"
                              disabled={submittingAction === 'approve-rental'}
                              onClick={() => void handleApproveRental(rental)}
                            >
                              Aceitar
                            </button>
                            <button
                              type="button"
                              className="moderation-action-btn delete"
                              disabled={submittingAction === 'approve-rental'}
                              onClick={() => void handleAdminRejectRental(rental)}
                            >
                              Rejeitar
                            </button>
                          </>
                        )}

                        {rental.status === 'pending' && (
                          <button
                            type="button"
                            className="moderation-action-btn approve"
                            disabled={submittingAction === 'verify-return'}
                            onClick={() => openRentalModal(rental)}
                          >
                            Verificar devolução
                          </button>
                        )}
                      </div>
                    </WithRole>
                  )}
                />
              )}
            </div>
          </article>
        </section>
      </main>

      <Modal
        open={isItemModalOpen}
        onClose={closeItemModal}
        title={
          itemModalMode === 'create'
            ? 'Novo item oficial'
            : itemModalMode === 'edit'
              ? `Editar item: ${selectedItem?.itemName || ''}`
              : selectedItem?.itemName || 'Detalhe do item'
        }
        description={
          itemModalMode === 'view'
            ? 'Consulta estado de stock, descrição e metadados do artigo oficial.'
            : 'Atualiza dados do catálogo oficial da escola e mantém o stock coerente com os alugueres.'
        }
        size="xl"
        footer={(
          <WithRole roles={['admin']}>
            {itemModalMode === 'view' ? (
              <div className="marketplace-modal-footer-actions">
                <button type="button" className="moderation-action-btn approve" onClick={() => openEditItemModal(selectedItem)}>
                  Editar artigo
                </button>
                <button
                  type="button"
                  className="moderation-action-btn delete"
                  disabled={submittingAction === 'delete-item'}
                  onClick={() => void handleDeleteItem(selectedItem)}
                >
                  Apagar
                </button>
              </div>
            ) : (
              <div className="marketplace-modal-footer-actions">
                <button type="button" className="moderation-action-btn neutral" onClick={closeItemModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="moderation-action-btn approve"
                  disabled={submittingAction === 'save-item'}
                  onClick={() => void handleSaveItem()}
                >
                  {submittingAction === 'save-item'
                    ? 'A guardar...'
                    : itemModalMode === 'create'
                      ? 'Criar item'
                      : 'Guardar alterações'}
                </button>
              </div>
            )}
          </WithRole>
        )}
      >
        {itemModalMode === 'view' ? (
          <div className="inventory-modal-grid">
            <div className="inventory-modal-main-column">
              {selectedItemPhotoUrl && !itemImageFailed ? (
                <img
                  src={selectedItemPhotoUrl}
                  alt={selectedItem?.itemName || 'Artigo'}
                  className="inventory-modal-image"
                  onError={() => setItemImageFailed(true)}
                />
              ) : (
                <div className="inventory-modal-image-empty">Sem imagem</div>
              )}

              <div className="inventory-modal-meta-block">
                <div className="inventory-modal-meta-head">
                  <Badge variant={selectedItemStatusTone}>{getItemStatusLabel(selectedItem?.status)}</Badge>
                  <span className="inventory-modal-price">{formatMoney(selectedItem?.symbolicFee)}</span>
                </div>

                <p className="inventory-modal-description">{selectedItem?.description || 'Sem descrição adicional.'}</p>
              </div>
            </div>

            <div className="inventory-modal-side-column">
              <div className="soft-box">
                <strong>Categoria e stock</strong>
                <p className="inventory-modal-line-first">
                  Categoria: {selectedItem?.category?.categoryName || '—'}
                </p>
                <p className="inventory-modal-line-regular">
                  Total: {Number(selectedItem?.totalQuantity || 0)}
                </p>
                <p className="inventory-modal-line-regular">
                  Reservado: {Number(selectedItem?.reservedQuantity || 0)}
                </p>
                <p className="inventory-modal-line-regular">
                  Disponível: {Number(selectedItem?.availableQuantity || 0)}
                </p>
              </div>

              <div className="soft-box">
                <strong>Identificação técnica</strong>
                <p className="inventory-modal-line-first">ID: #{selectedItem?.itemId || '—'}</p>
                <p className="inventory-modal-line-regular">Tipo: Artigo oficial da escola</p>
                <p className="inventory-modal-line-regular">
                  Disponibilidade: {selectedItem?.isAvailable ? 'Disponível para aluguer' : 'Sem stock disponível'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="form-grid two inventory-item-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Nome do item
              <input
                type="text"
                value={itemForm.itemName}
                onChange={(event) => updateItemForm('itemName', event.target.value)}
                placeholder="Ex.: Figurino clássico lote B"
                maxLength={100}
                required
              />
            </label>

            <label>
              Categoria
              {hasCategoryOptions ? (
                <select
                  value={itemForm.categoryId}
                  onChange={(event) => updateItemForm('categoryId', event.target.value)}
                  required
                >
                  <option value="">Selecionar categoria</option>
                  {categoryOptions.map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.categoryName}
                    </option>
                  ))}
                  <option value="__new__">+ Nova categoria</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={itemForm.categoryName}
                  onChange={(event) => updateItemForm('categoryName', event.target.value)}
                  placeholder="Nome da nova categoria"
                  maxLength={50}
                  required
                />
              )}
              {hasCategoryOptions && itemForm.categoryId === '__new__' ? (
                <input
                  type="text"
                  value={itemForm.categoryName}
                  onChange={(event) => updateItemForm('categoryName', event.target.value)}
                  placeholder="Ex.: Sopro"
                  maxLength={50}
                  required
                  style={{ marginTop: '0.5rem' }}
                />
              ) : null}
              {!hasCategoryOptions ? (
                <small style={{ color: 'var(--studio-muted)', fontSize: '0.8rem' }}>
                  Sem categorias carregadas. O nome será criado como nova categoria.
                </small>
              ) : null}
            </label>

            <label>
              Taxa simbólica (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.symbolicFee}
                onChange={(event) => updateItemForm('symbolicFee', event.target.value)}
                required
              />
            </label>

            <label>
              Quantidade total
              <input
                type="number"
                min="1"
                step="1"
                value={itemForm.totalQuantity}
                onChange={(event) => updateItemForm('totalQuantity', event.target.value)}
                required
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Descrição
              <textarea
                rows={4}
                value={itemForm.description}
                onChange={(event) => updateItemForm('description', event.target.value)}
                placeholder="Descrição interna do artigo, uso recomendado e observações."
                maxLength={255}
              />
            </label>

            <label>
              Carregar imagem
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null
                  setItemFile(nextFile)
                  setItemImageFailed(false)

                  setItemFilePreviewUrl((currentPreview) => {
                    if (currentPreview) {
                      URL.revokeObjectURL(currentPreview)
                    }

                    return nextFile ? URL.createObjectURL(nextFile) : ''
                  })
                }}
              />
            </label>

            <label>
              URL da imagem (opcional)
              <input
                type="text"
                value={itemForm.photoUrl}
                onChange={(event) => updateItemForm('photoUrl', event.target.value)}
                placeholder="/uploads/inventory/..."
                maxLength={255}
              />
            </label>

            <div className="inventory-item-form-preview">
              {selectedItemPhotoUrl && !itemImageFailed ? (
                <img
                  src={selectedItemPhotoUrl}
                  alt={itemForm.itemName || 'Pré-visualização'}
                  className="inventory-modal-image"
                  onError={() => setItemImageFailed(true)}
                />
              ) : (
                <div className="inventory-modal-image-empty">Sem pré-visualização</div>
              )}
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={isRentalModalOpen}
        onClose={closeRentalModal}
        title={selectedRental?.reference ? `Devolução ${selectedRental.reference}` : 'Verificação de devolução'}
        description="Confirma o estado do artigo devolvido e conclui o ciclo de aluguer."
        size="lg"
        footer={(
          <WithRole roles={['admin']}>
            <div className="marketplace-modal-footer-actions">
              <button type="button" className="moderation-action-btn neutral" onClick={closeRentalModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="moderation-action-btn reject"
                disabled={submittingAction === 'reject-return' || selectedRental?.status !== 'pending'}
                onClick={handleRejectReturn}
              >
                Rejeitar devolução
              </button>
              <button
                type="button"
                className="moderation-action-btn approve"
                disabled={submittingAction === 'verify-return'}
                onClick={() => void handleVerifyReturn()}
              >
                {submittingAction === 'verify-return' ? 'A validar...' : 'Confirmar devolução'}
              </button>
            </div>
          </WithRole>
        )}
      >
        <div className="inventory-rental-modal-grid">
          <div className="soft-box">
            <strong>Resumo do aluguer</strong>
            <p className="inventory-modal-line-first">
              Artigo: {selectedRental?.item?.itemName || '—'}
            </p>
            <p className="inventory-modal-line-regular">
              Requisitante: {[selectedRental?.borrower?.firstName, selectedRental?.borrower?.lastName].filter(Boolean).join(' ') || '—'}
            </p>
            <p className="inventory-modal-line-regular">
              Email: {selectedRental?.borrower?.email || '—'}
            </p>
            <p className="inventory-modal-line-regular">
              Período: {formatDate(selectedRental?.startDate)} → {formatDate(selectedRental?.endDate)}
            </p>
            <p className="inventory-modal-line-regular">
              Estado: <Badge variant={selectedRentalStatusTone}>{getRentalStatusLabel(selectedRental?.status)}</Badge>
            </p>
          </div>

          <label className="inventory-return-panel">
            <span className="inventory-return-title">Estado do artigo na devolução</span>
            <select
              value={returnForm.conditionStatus}
              onChange={(event) => setReturnForm((current) => ({
                ...current,
                conditionStatus: event.target.value,
              }))}
            >
              <option value="good">Bom</option>
              <option value="damaged">Danificado</option>
              <option value="lost">Perdido</option>
            </select>

            <span className="inventory-return-title">Notas da verificação</span>
            <textarea
              rows={5}
              value={returnForm.conditionNotes}
              onChange={(event) => setReturnForm((current) => ({
                ...current,
                conditionNotes: event.target.value,
              }))}
              placeholder="Descreve estado, danos ou observações da devolução."
              maxLength={255}
            />
          </label>
        </div>
      </Modal>
    </div>
  )
}
