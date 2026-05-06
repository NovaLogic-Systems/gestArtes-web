/**
 * @file src/pages/student/RentalCheckoutPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import { createInventoryRental, getInventoryItemById } from '../../services/inventory'
import './DashboardPage.css'
import './inventory.css'

const DEFAULT_PAYMENT_METHOD_ID = 1

function formatMoney(value) {
	const numeric = Number(value)

	if (Number.isNaN(numeric)) {
		return '€0,00'
	}

	return new Intl.NumberFormat('pt-PT', {
		currency: 'EUR',
		style: 'currency',
	}).format(numeric)
}

function toDateInputValue(value) {
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) {
		return ''
	}

	return date.toISOString().slice(0, 10)
}

function addDays(baseDate, days) {
	const date = new Date(baseDate)
	date.setDate(date.getDate() + days)
	return date
}

function buildRequestDates() {
	const today = new Date()
	return {
		startDate: toDateInputValue(today),
		endDate: toDateInputValue(addDays(today, 4)),
	}
}

export default function RentalCheckoutPage() {
	const navigate = useNavigate()
	const { itemId } = useParams()

	const [item, setItem] = useState(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const initialDates = useMemo(buildRequestDates, [])
	const [form, setForm] = useState(() => ({
		startDate: initialDates.startDate,
		endDate: initialDates.endDate,
	}))

	useEffect(() => {
		let active = true

		async function loadItem() {
			try {
				setLoading(true)
				setError('')
				const response = await getInventoryItemById(itemId)

				if (!active) {
					return
				}

				setItem(response)
				const startDate = initialDates.startDate
				const endDate = initialDates.endDate
				setForm({ startDate, endDate })
			} catch (requestError) {
				if (active) {
					setItem(null)
					setError(requestError?.response?.data?.error || 'Não foi possível carregar o artigo selecionado.')
				}
			} finally {
				if (active) {
					setLoading(false)
				}
			}
		}

		loadItem()

		return () => {
			active = false
		}
	}, [initialDates.endDate, initialDates.startDate, itemId])

	const availableQuantity = Number(item?.availableQuantity ?? 0)
	const canSubmit = Boolean(item) && availableQuantity > 0 && form.startDate && form.endDate && !saving
	const summaryDateLabel = useMemo(() => {
		if (!form.endDate) {
			return '—'
		}

		const date = new Date(form.endDate)
		return new Intl.DateTimeFormat('pt-PT', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		}).format(date)
	}, [form.endDate])

	async function handleSubmit(event) {
		event.preventDefault()

		try {
			setSaving(true)
			setError('')

			await createInventoryRental({
				inventoryItemId: Number(itemId),
				startDate: form.startDate,
				endDate: form.endDate,
				paymentMethodId: DEFAULT_PAYMENT_METHOD_ID,
			})

			navigate('/student/inventory/rentals', {
				replace: true,
				state: {
					successMessage: 'Pedido submetido com sucesso. A admin vai analisar e aprovar/rejeitar. O pagamento é feito presencialmente na escola.',
				},
			})
		} catch (requestError) {
			setError(requestError?.response?.data?.error || 'Não foi possível submeter o pedido de aluguer.')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="student-dashboard inventory-page">
			<div className="app-shell inventory-checkout-shell">
				<main className="main inventory-checkout-main">
					<header className="topbar">
						<div className="topbar-left">
							<h2>Pedido de aluguer</h2>
							<p>Resumo final antes de enviar o pedido para validação da administração.</p>
						</div>
						<div className="topbar-right">
							<Button as={Link} variant="secondary" size="sm" to="/student/inventory">
								Voltar ao catálogo
							</Button>
						</div>
					</header>

					<section className="inventory-checkout-banner">
						<div>
							<p className="inventory-kicker">Inventário da escola</p>
							<h3>Este pedido segue para aprovação da administração.</h3>
							<p>Não existe gateway online. Se for aprovado, pagas e levantas o artigo diretamente na escola.</p>
						</div>
						<Badge variant="warning">Pagamento na escola</Badge>
					</section>

					<section className="inventory-layout inventory-checkout-layout">
						<article className="panel inventory-summary-panel">
							<h3>Resumo do artigo</h3>
							{loading ? (
								<LoadingSkeleton variant="block" height="14rem" />
							) : item ? (
								<div className="inventory-summary-card">
									{item.photoUrl ? <img src={item.photoUrl} alt={item.itemName} /> : <div className="inventory-summary-image-empty">Sem imagem</div>}
									<div>
										<h4>{item.itemName}</h4>
										<p>{item.description || 'Artigo do inventário escolar.'}</p>
										<div className="inventory-summary-badges">
											<Badge variant={availableQuantity > 0 ? 'success' : 'warning'}>
												{availableQuantity > 0 ? 'Disponível' : 'Reservado'}
											</Badge>
											<Badge variant="neutral">Condição: {item.conditionLabel || 'Verificado'}</Badge>
										</div>
										<table className="inventory-summary-table">
											<tbody>
												<tr><td>Categoria</td><td>{item.category?.categoryName || 'Inventário da escola'}</td></tr>
												<tr><td>Taxa simbólica</td><td>{formatMoney(item.symbolicFee)}</td></tr>
												<tr><td>Unidades disponíveis</td><td>{availableQuantity}</td></tr>
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className="inventory-empty-state">
									<h4>Artigo indisponível</h4>
									<p>Volta ao catálogo e escolhe outro artigo.</p>
									<Button as={Link} to="/student/inventory" variant="cta" size="sm">
										Ver catálogo
									</Button>
								</div>
							)}
						</article>

						<form className="panel inventory-checkout-form" onSubmit={handleSubmit}>
							<h3>Pedido e datas</h3>
							<p className="inventory-form-note">O pedido é registado na plataforma e enviado para validação da administração. O pagamento e o levantamento é sempre presencial na escola.</p>

							<div className="inventory-checkout-fields">
								<Input
									label="Data de início"
									type="date"
									value={form.startDate}
									onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
									min={toDateInputValue(new Date())}
								/>
								<Input
									label="Data de devolução"
									type="date"
									value={form.endDate}
									onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
									min={form.startDate || toDateInputValue(new Date())}
								/>
							</div>

							<section className="inventory-checkout-summary">
								<h4>Resumo de confirmação</h4>
								<ul>
									<li><span>Artigo</span><strong>{item?.itemName || '—'}</strong></li>
									<li><span>Taxa simbólica</span><strong>{formatMoney(item?.symbolicFee)}</strong></li>
									<li><span>Devolução prevista</span><strong>{summaryDateLabel}</strong></li>
									<li><span>Validação</span><strong>Administração (aprovação/rejeição)</strong></li>
									<li><span>Pagamento</span><strong>Presencial, na escola</strong></li>
								</ul>
							</section>

							{error ? <p className="inventory-error-banner">{error}</p> : null}

							<div className="inventory-checkout-actions">
								<Button as={Link} to="/student/inventory" variant="secondary" type="button">
									Cancelar
								</Button>
								<Button type="submit" variant="cta" disabled={!canSubmit}>
									{saving ? 'A enviar...' : 'Confirmar pedido'}
								</Button>
							</div>
						</form>
					</section>
				</main>
			</div>
		</div>
	)
}
