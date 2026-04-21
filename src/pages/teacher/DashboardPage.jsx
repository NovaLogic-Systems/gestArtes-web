import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../../components/layout/Sidebar'
import { Topbar } from '../../components/layout/Topbar'
import { KPICard } from '../../components/ui/KPICard'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { useAuth } from '../../hooks/useAuth'
import QuickActions from './QuickActions'

const KPI_DATA = [
	{ title: 'Aulas hoje', value: '4' },
	{ title: 'Confirmações pendentes', value: '2' },
	{ title: 'Pedidos de adesão', value: '3' },
	{ title: 'Faltas sem aviso', value: '1' },
]

const AGENDA_COLUMNS = [
	{ key: 'hora', header: 'Hora' },
	{ key: 'sessao', header: 'Sessão' },
	{ key: 'formato', header: 'Formato' },
	{ key: 'estudio', header: 'Estúdio' },
	{
		key: 'estado',
		header: 'Estado',
		render: (row) => <Badge variant={row.estadoVariant}>{row.estado}</Badge>,
	},
]

const AGENDA_ROWS = [
	{ id: 1, hora: '18:00', sessao: '#5012', formato: 'Individual', estudio: 'E3', estado: 'Concluída', estadoVariant: 'ok' },
	{ id: 2, hora: '19:00', sessao: '#5015', formato: 'Dueto', estudio: 'E1', estado: 'Em curso', estadoVariant: 'warn' },
	{ id: 3, hora: '20:00', sessao: '#5016', formato: 'Trio', estudio: 'E4', estado: 'Agendada', estadoVariant: 'warn' },
]

const JOIN_REQUESTS = [
	{ id: '#JR-2201', sessao: '#5016', genero: 'aluna', nome: 'Marta Leal' },
	{ id: '#JR-2202', sessao: '#5018', genero: 'aluno', nome: 'Tiago Paiva' },
	{ id: '#JR-2203', sessao: '#5020', genero: 'aluna', nome: 'Lara Nunes' },
]

const panelStyle = {
	background: '#ffffff',
	border: '1px solid #e2d9eb',
	borderRadius: '1rem',
	boxShadow: '0 14px 36px rgba(31, 28, 46, 0.12)',
	padding: '1rem',
	display: 'grid',
	gap: '0.625rem',
	alignContent: 'start',
}

const pillStyle = {
	background: '#fff3ee',
	border: '1px solid #f2c2af',
	borderRadius: '999px',
	color: '#8c402a',
	cursor: 'pointer',
	font: 'inherit',
	fontWeight: 500,
	padding: '0.5rem 0.75rem',
	whiteSpace: 'nowrap',
}

export default function DashboardPage() {
	const navigate = useNavigate()
	const { logout } = useAuth()
	const [mobileOpen, setMobileOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 1024)
		check()
		window.addEventListener('resize', check)
		return () => window.removeEventListener('resize', check)
	}, [])

	async function handleLogout() {
		try {
			await logout()
			navigate('/login')
		} catch {
			navigate('/login')
		}
	}

	const navGroups = [
		{
			id: 'teacher',
			label: 'Professor',
			items: [
				{ label: 'Painel', href: '/teacher/dashboard', active: true },
				{ label: 'Horário', href: '/teacher/schedule' },
				{ label: 'Coaching', href: '/teacher/coaching' },
				{ label: 'Inventário da Escola', href: '/teacher/inventory' },
				{ label: 'Marketplace', href: '/teacher/marketplace' },
				{ label: 'Minha Conta', href: '/teacher/account' },
			],
		},
	]

	const sidebarFooter = (
		<button
			type="button"
			onClick={handleLogout}
			style={{
				background: 'transparent',
				border: '1px solid #e2d9eb',
				borderRadius: '0.625rem',
				color: '#2e2942',
				cursor: 'pointer',
				font: 'inherit',
				padding: '0.56rem 0.625rem',
				textAlign: 'left',
				width: '100%',
			}}
		>
			Terminar Sessão
		</button>
	)

	const topbarEnd = (
		<>
			<button type="button" onClick={() => navigate('/teacher/account')} style={pillStyle}>
				Minha Conta
			</button>
			<button type="button" style={pillStyle}>
				Notificações 7
			</button>
		</>
	)

	return (
		<div style={{
			background: 'linear-gradient(150deg, #fdf7f5 0%, #f7f0fb 45%, #effaf8 100%)',
			display: 'flex',
			height: '100vh',
			overflow: 'hidden',
		}}>
			{isMobile && mobileOpen && (
				<div
					onClick={() => setMobileOpen(false)}
					style={{
						background: 'rgba(0,0,0,0.4)',
						inset: 0,
						position: 'fixed',
						zIndex: 99,
					}}
				/>
			)}
			<Sidebar
				brand={{ title: 'gestArtes', subtitle: 'Professor' }}
				groups={navGroups}
				footer={sidebarFooter}
				isMobile={isMobile}
				mobileOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
				onItemClick={({ item }) => {
					navigate(item.href)
					if (isMobile) setMobileOpen(false)
				}}
			/>

			<main style={{ flex: 1, overflow: 'auto', padding: '1.125rem 1.25rem 1.5rem' }}>
				<Topbar
					title="Painel Professor"
					subtitle="Operação diária de aulas, faltas e pedidos de adesão"
					onMenuToggle={isMobile ? () => setMobileOpen(true) : undefined}
					endContent={topbarEnd}
				/>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
						gap: '0.625rem',
						marginBottom: '0.875rem',
					}}
				>
					{KPI_DATA.map((kpi) => (
						<KPICard
							key={kpi.title}
							title={kpi.title}
							value={kpi.value}
							style={{
								background: 'linear-gradient(145deg, #fff8f5, #f1fbf8)',
								border: '1px solid #e2d9eb',
								borderRadius: '0.75rem',
							}}
						/>
					))}
				</div>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
						gap: '0.875rem',
					}}
				>
					<article style={panelStyle}>
						<h3 style={{ margin: 0, color: '#1f1c2e' }}>Agenda de hoje</h3>
						<Table
							columns={AGENDA_COLUMNS}
							rows={AGENDA_ROWS}
							getRowKey={(row) => row.id}
							striped
							headBackground="#f8f1fc"
						/>
					</article>

					<article style={panelStyle}>
						<h3 style={{ margin: 0, color: '#1f1c2e' }}>Ações rápidas</h3>
						<QuickActions />
						<h3 style={{ margin: '0.25rem 0 0', color: '#1f1c2e' }}>Pedidos de adesão em fila</h3>
						<ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.25rem' }}>
							{JOIN_REQUESTS.map((jr) => (
								<li key={jr.id} style={{ color: '#4b4565' }}>
									{jr.id} - Sessão {jr.sessao} - {jr.genero} {jr.nome}
								</li>
							))}
						</ul>
					</article>
				</div>
			</main>
		</div>
	)
}
