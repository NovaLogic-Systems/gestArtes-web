/**
 * @file src/pages/student/RentalRequestsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Table from '../../components/ui/Table'
import { listInventoryRentals } from '../../services/inventory'
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './inventory.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'

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

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return '—'
	}

	return new Intl.DateTimeFormat('pt-PT', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date)
}

function resolveStatusLabel(status) {
	const normalized = String(status || '').toLowerCase()

	if (normalized.includes('complete')) {
		return 'Concluído'
	}

	if (normalized.includes('return')) {
		return 'Devolução validada'
	}

	if (normalized.includes('condition')) {
		return 'Aceite pela Direção'
	}

	if (normalized.includes('approved')) {
		return 'Aprovado'
	}

	if (normalized.includes('awaiting') || normalized.includes('awaiting-approval')) {
		return 'A aguardar aprovação'
	}

	if (normalized.includes('rejected')) {
		return 'Rejeitado'
	}

	return 'A aguardar admin'
}

function resolveStatusVariant(status) {
	const normalized = String(status || '').toLowerCase()

	if (normalized.includes('complete') || normalized.includes('approved')) {
		return 'success'
	}

	if (normalized.includes('return') || normalized.includes('condition')) {
		return 'info'
	}

	if (normalized.includes('rejected')) {
		return 'error'
	}

	return 'warning'
}

export default function RentalRequestsPage() {
	const location = useLocation()
	const navigate = useNavigate()
	const { logout, user } = useAuth()

	const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
	const [mobileOpen, setMobileOpen] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

	const sidebarHidden = isMobile || sidebarCollapsed
	const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : '']
		.filter(Boolean)
		.join(' ')
	const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : '']
		.filter(Boolean)
		.join(' ')

	const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : sidebarCollapsed ? '▶' : '◀'
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

	const [rentals, setRentals] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const searchTerm = ''
	const successMessage = location.state?.successMessage || ''

	useEffect(() => {
		let active = true

		async function loadRentals() {
			try {
				setLoading(true)
				setError('')
				const response = await listInventoryRentals()
				if (active) {
					setRentals(response)
				}
			} catch (requestError) {
				if (active) {
					setRentals([])
					setError(requestError?.response?.data?.error || 'Não foi possível carregar os pedidos de aluguer.')
				}
			} finally {
				if (active) {
					setLoading(false)
				}
			}
		}

		loadRentals()

		return () => {
			active = false
		}
	}, [])

	const rows = useMemo(() => {
		const term = searchTerm.trim().toLowerCase()
		const filtered = !term ? rentals : rentals.filter((r) =>
			[r.item?.itemName, r.status].join(' ').toLowerCase().includes(term)
		)
		return filtered.map((rental) => ({
			id: rental.rentalId,
			itemName: rental.item?.itemName || 'Artigo',
			period: `${formatDate(rental.startDate)} → ${formatDate(rental.endDate)}`,
			symbolicFee: formatMoney(rental.symbolicFee),
			status: rental.status,
			payment: 'Pagamento presencial na escola',
		}))
	}, [rentals, searchTerm])

	const columns = [
		{ header: 'Artigo', key: 'itemName' },
		{ header: 'Período', key: 'period' },
		{ header: 'Taxa simbólica', key: 'symbolicFee' },
		{
			header: 'Estado',
			key: 'status',
			render: (row) => <Badge variant={resolveStatusVariant(row.status)}>{resolveStatusLabel(row.status)}</Badge>,
		},
		{ header: 'Pagamento', key: 'payment' },
	]

	return (
		<div className="student-dashboard inventory-page">
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
							Terminar Sessão
						</button>
					</div>
				</aside>

				<main className="main inventory-checkout-main inventory-history-main">
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
								<h2>Pedidos de aluguer</h2>
							</div>
						</div>
						<div className="topbar-right">
							<NotificationsBell pageLink="/student/notifications" />
							<Button as={Link} variant="secondary" size="sm" to="/student/inventory">
								Voltar ao catálogo
							</Button>
						</div>
					</header>

					<section className="panel inventory-history-panel">
						<div className="inventory-feed-header">
							<div>
								<h3>Pedidos submetidos</h3>
								<p>{rows.length} pedido(s) registado(s)</p>
							</div>
						</div>

						{successMessage ? <p className="inventory-success-banner">{successMessage}</p> : null}
						{error ? <p className="inventory-error-banner">{error}</p> : null}

						{loading ? <LoadingSkeleton variant="block" height="12rem" /> : <Table columns={columns} rows={rows} emptyState="Ainda não existem pedidos de aluguer para este aluno." />}

						<div className="inventory-history-footer">
							<Button as={Link} to="/student/inventory" variant="cta" size="sm">
								Explorar catálogo
							</Button>
						</div>
					</section>
				</main>
			</div>
		</div>
	)
}
