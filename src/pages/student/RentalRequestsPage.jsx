import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Table from '../../components/ui/Table'
import { listInventoryRentals } from '../../services/inventory'
import './DashboardPage.css'
import './inventory.css'

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
		return 'Aceite pela admin'
	}

	return 'A aguardar admin'
}

function resolveStatusVariant(status) {
	const normalized = String(status || '').toLowerCase()

	if (normalized.includes('complete')) {
		return 'success'
	}

	if (normalized.includes('return') || normalized.includes('condition')) {
		return 'info'
	}

	return 'warning'
}

export default function RentalRequestsPage() {
	const location = useLocation()

	const [rentals, setRentals] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
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
		return rentals.map((rental) => ({
			id: rental.rentalId,
			itemName: rental.item?.itemName || 'Artigo',
			period: `${formatDate(rental.startDate)} → ${formatDate(rental.endDate)}`,
			symbolicFee: formatMoney(rental.symbolicFee),
			status: rental.status,
			payment: 'Pagamento presencial na escola',
		}))
	}, [rentals])

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
			<div className="app-shell inventory-checkout-shell">
				<main className="main inventory-checkout-main inventory-history-main">
					<header className="topbar">
						<div className="topbar-left">
							<h2>Pedidos de aluguer</h2>
							<p>Histórico de pedidos enviados para validação da admin.</p>
						</div>
						<div className="topbar-right">
							<Button as={Link} variant="secondary" size="sm" to="/student/inventory">
								Voltar ao catálogo
							</Button>
						</div>
					</header>

					<section className="inventory-banner inventory-history-banner">
						<div>
							<p className="inventory-kicker">Registo offline</p>
							<h3>A admin aprova ou rejeita cada pedido.</h3>
							<p>Depois da aprovação, o pagamento e a recolha são feitos presencialmente na escola.</p>
						</div>
						<Badge variant="info">Sem gateway online</Badge>
					</section>

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
