/**
 * @file src/pages/student/InventoryPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import InventoryCatalog from '../../components/InventoryCatalog'
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './inventory.css'
import { STUDENT_NAV_ITEMS as NAV_ITEMS } from './studentNav'

export default function InventoryPage() {
	const { logout, user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()
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
							<h2>Inventário da Escola</h2>
							</div>
						</div>

						<div className="topbar-right">
							<NotificationsBell pageLink="/student/notifications" />
							<Button as={Link} variant="secondary" to="/student/inventory/rentals" size="sm">
								Pedidos de aluguer
							</Button>
						</div>
					</header>

					<InventoryCatalog 
						onRentalCreated={() => navigate('/student/inventory/rentals')} 
						modalClassName="student-inventory-modal" 
					/>
				</main>
			</div>
		</div>
	)
}
