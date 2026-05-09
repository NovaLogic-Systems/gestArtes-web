/**
 * @file src/pages/student/InventoryPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import InventoryCatalog from '../../components/InventoryCatalog'
import './DashboardPage.css'
import './inventory.css'

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

export default function InventoryPage() {
	const { logout, user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()

	const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'

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

					<InventoryCatalog 
						onRentalCreated={() => navigate('/student/inventory/rentals')} 
						modalClassName="student-inventory-modal" 
					/>
				</main>
			</div>
		</div>
	)
}
