/**
 * @file src/pages/student/InventoryPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Modal from '../../components/ui/Modal'
import InventoryItemCard from '../../components/InventoryItemCard'
import { listInventoryItems } from '../../services/inventory'
import './DashboardPage.css'
import './inventory.css'

const NAV_ITEMS = [
	{ label: 'Painel', href: '/student/dashboard' },
	{ label: 'Coaching', href: '/student/coaching' },
	{ label: 'Inventário da Escola', href: '/student/inventory' },
	{ label: 'Marketplace', href: '/student/marketplace' },
	{ label: 'Perdidos e Achados', href: '/student/lostfound' },
	{ label: 'Minha Conta', href: '/student/account' },
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

function normalizeItem(item) {
	return {
		...item,
		conditionLabel: item?.conditionLabel || 'Verificado',
	}
}

function getAvailabilityLabel(item) {
	const availableQuantity = Number(item?.availableQuantity ?? 0)
	return availableQuantity > 0 ? 'Disponível' : 'Reservado'
}

export default function InventoryPage() {
	const { logout, user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()

	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [search, setSearch] = useState('')
	const [category, setCategory] = useState('')
	const [availability, setAvailability] = useState('all')
	const [selectedItem, setSelectedItem] = useState(null)
	const [detailOpen, setDetailOpen] = useState(false)

	const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

	const loadItems = useCallback(async () => {
		try {
			setLoading(true)
			setError('')

			const response = await listInventoryItems({ onlyAvailable: false })
			setItems(response.map(normalizeItem))
		} catch (requestError) {
			setItems([])
			setError(requestError?.response?.data?.error || 'Não foi possível carregar o inventário escolar.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadItems()
	}, [loadItems])

	const categories = useMemo(() => {
		const unique = new Map()

		for (const item of items) {
			const categoryId = item?.category?.categoryId
			const categoryName = item?.category?.categoryName

			if (!categoryId || !categoryName || unique.has(String(categoryId))) {
				continue
			}

			unique.set(String(categoryId), categoryName)
		}

		return Array.from(unique.entries()).map(([value, label]) => ({ value, label }))
	}, [items])

	const filteredItems = useMemo(() => {
		const searchTerm = search.trim().toLowerCase()

		return items.filter((item) => {
			const searchable = [item?.itemName, item?.description, item?.category?.categoryName]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()

			if (searchTerm && !searchable.includes(searchTerm)) {
				return false
			}

			if (category && String(item?.category?.categoryId || '') !== category) {
				return false
			}

			if (availability === 'available' && Number(item?.availableQuantity ?? 0) <= 0) {
				return false
			}

			if (availability === 'reserved' && Number(item?.availableQuantity ?? 0) > 0) {
				return false
			}

			return true
		})
	}, [availability, category, items, search])

	function openDetails(item) {
		setSelectedItem(item)
		setDetailOpen(true)
	}

	function goToCheckout(item) {
		navigate(`/student/inventory/checkout/${item.itemId}`)
	}

	return (
		<div className="student-dashboard inventory-page">
			<div className="app-shell">
				<aside className="sidebar" id="sidebar">
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
							Terminar Sessão
						</button>
					</div>
				</aside>

				<main className="main">
					<header className="topbar">
						<div className="topbar-left">
							<h2>Inventário da Escola</h2>
							<p>Catálogo oficial para pedidos de aluguer. A admin aprova ou rejeita e o pagamento é feito na escola.</p>
						</div>

						<div className="topbar-right">
							<Button as={Link} variant="secondary" to="/student/inventory/rentals" size="sm">
								Ver pedidos
							</Button>
							<Button as={Link} variant="cta" to="/student/dashboard" size="sm">
								Painel
							</Button>
						</div>
					</header>

					<section className="inventory-layout">
						<aside className="inventory-filters panel">
							<h3>Filtros</h3>
							<Input
								label="Pesquisar"
								placeholder="Nome, categoria ou descrição"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>

							<label>
								<span>Categoria</span>
								<select value={category} onChange={(event) => setCategory(event.target.value)}>
									<option value="">Todas</option>
									{categories.map((entry) => (
										<option key={entry.value} value={entry.value}>
											{entry.label}
										</option>
									))}
								</select>
							</label>

							<label>
								<span>Disponibilidade</span>
								<select value={availability} onChange={(event) => setAvailability(event.target.value)}>
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

							{error ? <p className="inventory-error-banner">{error}</p> : null}

							{loading ? (
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
										<InventoryItemCard key={item.itemId} item={item} onOpenDetails={openDetails} onRent={goToCheckout} />
									))}
								</div>
							)}
						</section>
					</section>
				</main>
			</div>

			<Modal
				open={detailOpen}
				onClose={() => setDetailOpen(false)}
				title={selectedItem?.itemName || 'Detalhe do artigo'}
				description={selectedItem?.description || 'Artigo do inventário escolar.'}
				size="lg"
				footer={
					<div className="inventory-modal-actions">
						<Button variant="secondary" onClick={() => setDetailOpen(false)}>
							Fechar
						</Button>
						<Button disabled={Number(selectedItem?.availableQuantity ?? 0) <= 0} onClick={() => goToCheckout(selectedItem)}>
							Alugar
						</Button>
					</div>
				}
			>
				{selectedItem ? (
					<div className="inventory-detail-grid">
						<div>
							{selectedItem.photoUrl ? <img className="inventory-detail-image" src={selectedItem.photoUrl} alt={selectedItem.itemName} /> : <div className="inventory-detail-image inventory-detail-image-empty">Sem imagem</div>}
						</div>

						<div className="inventory-detail-body">
							<p><strong>Categoria:</strong> {selectedItem?.category?.categoryName || 'Inventário da escola'}</p>
							<p><strong>Taxa simbólica:</strong> {formatMoney(selectedItem?.symbolicFee)}</p>
							<p><strong>Condição:</strong> {selectedItem?.conditionLabel || 'Verificado'}</p>
							<p><strong>Estado:</strong> {getAvailabilityLabel(selectedItem)}</p>
							<p><strong>Unidades disponíveis:</strong> {selectedItem?.availableQuantity ?? 0}</p>
						</div>
					</div>
				) : null}
			</Modal>
		</div>
	)
}
