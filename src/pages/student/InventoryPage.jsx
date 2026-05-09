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
import { createInventoryRental, listInventoryItems } from '../../services/inventory'
import './DashboardPage.css'
import './inventory.css'

const PAYMENT_METHOD_OPTIONS = [
	{ id: 1, label: 'MB Way' },
	{ id: 2, label: 'Cartão' },
	{ id: 3, label: 'Referência Multibanco' },
]

function toIsoDate(dateString) {
	if (!dateString) return null
	return `${dateString}T00:00:00.000Z`
}

const NAV_ITEMS = [
	{ label: 'Painel', href: '/student/dashboard' },
	{ label: 'Coaching', href: '/student/coaching' },
	{ label: 'Mapa de Coaching', href: '/student/coaching/map' },
	{ label: 'Inventário da Escola', href: '/student/inventory' },
	{ label: 'As Minhas Rendas', href: '/student/inventory/rentals' },
	{ label: 'Marketplace', href: '/student/marketplace' },
	{ label: 'Os Meus Anúncios', href: '/student/marketplace/my-listings' },
	{ label: 'Perdidos e Achados', href: '/student/lostfound' },
	{ label: 'Notificações', href: '/student/notifications' },
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

	const [rentalModal, setRentalModal] = useState({ open: false, item: null })
	const [rentalForm, setRentalForm] = useState({ startDate: '', endDate: '', paymentMethodId: PAYMENT_METHOD_OPTIONS[0].id })
	const [submittingRental, setSubmittingRental] = useState(false)
	const [rentalError, setRentalError] = useState('')

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
			await loadItems()
			navigate('/student/inventory/rentals')
		} catch (err) {
			setRentalError(err?.response?.data?.error || err?.response?.data?.message || 'Não foi possível criar a reserva.')
		} finally {
			setSubmittingRental(false)
		}
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
										<InventoryItemCard key={item.itemId} item={item} onOpenDetails={openDetails} onRent={openRentalModal} />
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
						<Button disabled={Number(selectedItem?.availableQuantity ?? 0) <= 0} onClick={() => {
							setDetailOpen(false)
							openRentalModal(selectedItem)
						}}>
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

			<Modal
				open={rentalModal.open}
				title={rentalModal.item ? `Alugar "${rentalModal.item.itemName}"` : 'Alugar artigo'}
				description="Seleciona o período de aluguer e o método de pagamento."
				size="md"
				className="student-inventory-modal"
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
							<p>Taxa simbólica: <strong>{formatMoney(rentalModal.item.symbolicFee)}</strong></p>
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
		</div>
	)
}
