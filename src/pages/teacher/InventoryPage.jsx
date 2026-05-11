import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Table from '../../components/ui/Table'
import NotificationsBell from '../../components/NotificationsBell'
import InventoryCatalog from '../../components/InventoryCatalog'
import { listInventoryRentals } from '../../services/inventory'
import '../admin-studios.css'
import '../student/inventory.css'
import './InventoryPage.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

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

export default function TeacherInventoryPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Professor'

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [activeTab, setActiveTab] = useState('items')
  const [rentals, setRentals] = useState([])
  const [loadingRentals, setLoadingRentals] = useState(true)
  const [error, setError] = useState('')
  const searchTerm = ''

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

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => { loadRentals() }, [loadRentals])

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

  const filteredRentals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rentals
    return rentals.filter((r) =>
      [r.reference, r.item?.itemName, r.status]
        .join(' ').toLowerCase().includes(term)
    )
  }, [rentals, searchTerm])

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
            </div>

            <div className="topbar-right">
              <button
                type="button"
                className="pill"
                onClick={() => setActiveTab('myRentals')}
              >
                Pedidos ({rentals.length})
              </button>
              <NotificationsBell pageLink="/teacher/notifications" />
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
                  onClick={() => { loadRentals() }}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}

            <div className="panel">
              {activeTab === 'items' ? (
                <InventoryCatalog 
                  onRentalCreated={() => { loadRentals(); setActiveTab('myRentals') }} 
                  modalClassName="teacher-inventory-modal" 
                />
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
                      rows={filteredRentals}
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
    </div>
  )
}
