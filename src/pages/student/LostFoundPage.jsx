/**
 * @file src/pages/student/LostFoundPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import { listLostFoundItems } from '../../services/lostFound'
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './lostfound.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'
import { localizeApiError } from '../../utils/apiErrors'

function formatDateLabel(value) {
	if (!value) {
		return '—'
	}

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return String(value)
	}

	return new Intl.DateTimeFormat('pt-PT', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date)
}

function normalizeLostFoundItem(item) {
	const title = String(item?.title ?? '').trim()
	const description = String(item?.description ?? '').trim()

	return {
		...item,
		title: title || 'Objeto sem título',
		description: description || 'Sem descrição adicional.',
		photoUrl: String(item?.photoUrl ?? '').trim(),
		claimedStatus: Boolean(item?.claimedStatus),
	}
}

function getStatusLabel(item) {
	return item?.claimedStatus ? 'Reclamado' : 'Por reclamar'
}

function getStatusVariant(item) {
	return item?.claimedStatus ? 'success' : 'warning'
}

function sortByFoundDateDesc(items) {
	return [...items].sort((left, right) => {
		const leftTime = new Date(left?.foundDate || 0).getTime()
		const rightTime = new Date(right?.foundDate || 0).getTime()

		return rightTime - leftTime
	})
}

export default function LostFoundPage() {
	const { logout, user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()

	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [searchTerm, setSearchTerm] = useState('')
	const [filterLocation, setFilterLocation] = useState('')
	const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
	const [mobileOpen, setMobileOpen] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

	const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'
	const sidebarHidden = isMobile || sidebarCollapsed
	const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
	const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
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

	const loadItems = useCallback(async () => {
		try {
			setLoading(true)
			setError('')

			const response = await listLostFoundItems()
			setItems(response.map(normalizeLostFoundItem))
		} catch (requestError) {
			setItems([])
			setError(localizeApiError(requestError, 'Não foi possível carregar os itens perdidos e achados.'))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadItems()
	}, [loadItems])

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

	const visibleItems = useMemo(() => {
		const term = searchTerm.trim().toLowerCase()
		const locationTerm = filterLocation.trim().toLowerCase()
		let filtered = items
		if (locationTerm) {
			filtered = filtered.filter((i) => i.location && i.location.toLowerCase().includes(locationTerm))
		}
		if (term) {
			filtered = filtered.filter((i) =>
				[i.title, i.description, i.location].join(' ').toLowerCase().includes(term)
			)
		}
		return sortByFoundDateDesc(filtered)
	}, [items, searchTerm, filterLocation])

	const bannerMessage = 'Para reclamar um objeto, contacta a escola diretamente na secretaria.'

	return (
		<div className="student-dashboard lostfound-page">
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
								<h2>Perdidos e Achados</h2>
							</div>
						</div>

						<div className="topbar-right">
							<NotificationsBell pageLink="/student/notifications" />
						</div>
					</header>

					<section className="lostfound-banner panel">
						<div>
							<p className="inventory-kicker">Aviso importante:</p>
							<h3>{bannerMessage}</h3>
							<p>Se reconheces um objeto, fala diretamente com a escola.</p>
						</div>
					</section>

					<section className="lostfound-feed panel">
						<div className="inventory-feed-header">
							<div>
								<h3>Lista de objetos</h3>
								<p>{visibleItems.length} resultado(s) encontrado(s)</p>
							</div>
							<div className="lostfound-search">
								<input
									type="search"
									className="filter-input lostfound-search-input"
									placeholder="Pesquisar titulo, descricao ou local..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									aria-label="Pesquisar objetos perdidos e achados"
								/>
								{searchTerm ? (
									<button
										type="button"
										className="ghost-btn"
										onClick={() => setSearchTerm('')}
										aria-label="Limpar pesquisa"
									>
										Limpar
									</button>
								) : null}
							</div>
						</div>

							{error ? <p className="inventory-error-banner">{error}</p> : null}

							{loading ? (
								<div className="lostfound-table-shell">
									<table className="lostfound-table">
										<thead>
											<tr>
												<th>Item</th>
												<th>Data encontrada</th>
												<th>Estado</th>
											</tr>
										</thead>
										<tbody>
											{Array.from({ length: 3 }).map((_, index) => (
												<tr key={index}>
													<td>
														<div className="lostfound-skeleton-item">
															<LoadingSkeleton variant="block" height="4.5rem" width="4.5rem" />
															<div className="lostfound-skeleton-lines">
																<LoadingSkeleton lines={2} />
																<LoadingSkeleton variant="text" width="72%" />
															</div>
														</div>
													</td>
													<td><LoadingSkeleton variant="text" width="8rem" /></td>
													<td><LoadingSkeleton variant="text" width="6.5rem" /></td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : visibleItems.length === 0 ? (
								<div className="inventory-empty-state">
									<h4>Sem objetos para mostrar</h4>
									<p>Ainda não há objetos publicados.</p>
								</div>
							) : (
								<div className="lostfound-table-shell">
									<table className="lostfound-table">
										<thead>
											<tr>
												<th>Item</th>
												<th>Data encontrada</th>
												<th>Estado</th>
											</tr>
										</thead>
										<tbody>
											{visibleItems.map((item) => (
												<tr key={item.id}>
													<td>
														<div className="lostfound-item-cell">
															<div className="lostfound-photo">
																{item.photoUrl ? <img src={item.photoUrl} alt={item.title} /> : <span>Sem foto</span>}
															</div>
															<div className="lostfound-item-copy">
																<strong>{item.title}</strong>
																<p>{item.description}</p>
																{item.location && <small style={{ color: '#6b7280' }}>📍 {item.location}</small>}
															</div>
														</div>
													</td>
													<td>{formatDateLabel(item.foundDate)}</td>
													<td>
														<Badge variant={getStatusVariant(item)} size="sm">
															{getStatusLabel(item)}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</main>
			</div>
		</div>
	)
}