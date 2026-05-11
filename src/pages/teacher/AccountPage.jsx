/**
 * @file src/pages/teacher/AccountPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { changeTeacherPassword, fetchTeacherAccount, updateTeacherPhoneNumber } from '../../services/teacherAccount'
import NotificationsBell from '../../components/NotificationsBell'
import '../student/DashboardPage.css'
import '../student/account.css'
import { TEACHER_NAV_ITEMS as NAV_ITEMS } from './teacherNav'

function getInitials(profile) {
	const parts = [profile?.firstName, profile?.lastName].filter(Boolean)
	if (!parts.length) return 'P'
	return parts
		.map((part) => String(part).trim().charAt(0))
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

function formatCount(value) {
	return new Intl.NumberFormat('pt-PT').format(Number(value || 0))
}

function formatDateLabel(value) {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return String(value)
	return new Intl.DateTimeFormat('pt-PT', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date)
}

function normalizePhoneNumber(value) {
	return String(value || '').trim()
}

export default function TeacherAccountPage() {
	const { logout, user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()

	const [account, setAccount] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [phoneNumber, setPhoneNumber] = useState('')
	const [phoneSaving, setPhoneSaving] = useState(false)
	const [phoneError, setPhoneError] = useState('')
	const [passwordMessage, setPasswordMessage] = useState('')
	const [passwordOpen, setPasswordOpen] = useState(false)
	const [passwordSaving, setPasswordSaving] = useState(false)
	const [passwordError, setPasswordError] = useState('')
	const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
	const [mobileOpen, setMobileOpen] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'
	const profile = account?.profile ?? null
	const statistics = account?.statistics ?? null
	const modalities = Array.isArray(account?.modalities) ? account.modalities : []
	const normalizedPhone = normalizePhoneNumber(profile?.phoneNumber)
	const phoneDirty = normalizePhoneNumber(phoneNumber) !== normalizedPhone

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
		if (isMobile) setMobileOpen(false)
	}, [isMobile])

	const loadAccount = useCallback(async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetchTeacherAccount()
			setAccount(response)
			setPhoneNumber(normalizePhoneNumber(response?.profile?.phoneNumber))
		} catch (requestError) {
			setAccount(null)
			setPhoneNumber('')
			setError(requestError?.response?.data?.error || 'Não foi possível carregar a conta do professor.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => { loadAccount() }, [loadAccount])

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

	const statCards = useMemo(() => ([
		{ label: 'Sessões totais', value: formatCount(statistics?.totalSessions) },
		{ label: 'Sessões concluídas', value: formatCount(statistics?.completedSessions) },
		{ label: 'Próximas sessões', value: formatCount(statistics?.upcomingSessions) },
		{ label: 'Sessões este mês', value: formatCount(statistics?.monthSessions) },
		{ label: 'Pedidos de adesão pendentes', value: formatCount(statistics?.pendingAdmissions) },
		{ label: 'Disponibilidades em aprovação', value: formatCount(statistics?.pendingAvailabilities) },
	]), [statistics])

	const handlePhoneSave = async () => {
		if (!phoneDirty || phoneSaving) return
		try {
			setPhoneSaving(true)
			setPhoneError('')

			const response = await updateTeacherPhoneNumber(phoneNumber)
			const nextProfile = response?.profile ?? null
			if (nextProfile) {
				setAccount((current) => (current ? { ...current, profile: nextProfile } : current))
				setPhoneNumber(normalizePhoneNumber(nextProfile.phoneNumber))
			}
			toast.success('Número de telemóvel atualizado com sucesso.')
		} catch (requestError) {
			setPhoneError(requestError?.response?.data?.error || 'Não foi possível atualizar o número de telemóvel.')
		} finally {
			setPhoneSaving(false)
		}
	}

	const closePasswordModal = () => {
		setPasswordOpen(false)
		setPasswordError('')
		setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
	}

	const handlePasswordSubmit = async (event) => {
		event.preventDefault()
		if (passwordSaving) return

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setPasswordError('As passwords nova e de confirmação não coincidem.')
			return
		}

		try {
			setPasswordSaving(true)
			setPasswordError('')

			await changeTeacherPassword({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword,
			})

			setPasswordMessage('Password atualizada com sucesso.')
			closePasswordModal()
			toast.success('Password atualizada com sucesso.')
		} catch (requestError) {
			setPasswordError(requestError?.response?.data?.error || 'Não foi possível alterar a password.')
		} finally {
			setPasswordSaving(false)
		}
	}

	const renderSkeleton = () => (
		<section className="account-layout">
			<div className="account-column">
				<article className="panel account-panel">
					<LoadingSkeleton variant="block" height="8rem" />
					<LoadingSkeleton lines={4} />
				</article>
				<article className="panel account-panel">
					<LoadingSkeleton lines={3} />
					<LoadingSkeleton variant="block" height="3.5rem" />
				</article>
			</div>
			<div className="account-column">
				<article className="panel account-panel">
					<LoadingSkeleton lines={5} />
				</article>
				<article className="panel account-panel">
					<LoadingSkeleton lines={4} />
				</article>
			</div>
		</section>
	)

	return (
		<div className="student-dashboard account-page">
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
							<p>{teacherName}</p>
						</div>
					</div>

					<div className="nav-group">
						<h2>Professor</h2>
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

				<main className="main page-transition">
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
								<h2>Minha Conta</h2>
							</div>
						</div>
						<div className="topbar-right">
							<NotificationsBell pageLink="/teacher/notifications" />
						</div>
					</header>

					{error ? <p className="inventory-error-banner">{error}</p> : null}
					{passwordMessage ? <p className="account-success-banner">{passwordMessage}</p> : null}

					{loading ? renderSkeleton() : (
						<section className="account-layout">
							<div className="account-column">
								<article className="panel account-panel account-profile-panel">
									<div className="account-profile-header">
										<div className="account-avatar">
											{profile?.photoUrl
												? <img src={profile.photoUrl} alt={`${profile.firstName} ${profile.lastName}`} />
												: getInitials(profile)}
										</div>
										<div className="account-profile-copy">
											<p className="inventory-kicker">Perfil do professor</p>
											<h3>{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}</h3>
											<div className="account-badges">
												<Badge variant="info" size="sm">{profile?.teacherCode || '—'}</Badge>
												<Badge variant="neutral" size="sm">{modalities.length} modalidade(s)</Badge>
											</div>
										</div>
									</div>

									<div className="account-note">
										<p>Para alterar dados pessoais para além do telemóvel/password contacta a direção da escola.</p>
									</div>

									<div className="account-readonly-grid">
										<div className="account-readonly-item"><span>Primeiro nome</span><strong>{profile?.firstName || '—'}</strong></div>
										<div className="account-readonly-item"><span>Último nome</span><strong>{profile?.lastName || '—'}</strong></div>
										<div className="account-readonly-item"><span>Email</span><strong>{profile?.email || '—'}</strong></div>
										<div className="account-readonly-item"><span>Número de telemóvel</span><strong>{profile?.phoneNumber || '—'}</strong></div>
										<div className="account-readonly-item"><span>Membro desde</span><strong>{formatDateLabel(profile?.memberSince)}</strong></div>
									</div>
								</article>

								<article className="panel account-panel">
									<div className="account-panel-head">
										<div>
											<h3>Contacto e segurança</h3>
											<p>Altera apenas o teu número de telemóvel e a password da conta.</p>
										</div>
									</div>

									<div className="account-form-stack">
										<Input
											label="Número de telemóvel"
											type="tel"
											inputMode="tel"
											autoComplete="tel"
											placeholder="912345678"
											value={phoneNumber}
											onChange={(event) => {
												setPhoneNumber(event.target.value.replace(/[^\d+\s]/g, ''))
												setPhoneError('')
											}}
											helperText="Este número é usado para contacto operacional da escola."
										/>

										<div className="quick-actions">
											<Button type="button" variant="cta" onClick={handlePhoneSave} disabled={!phoneDirty} isLoading={phoneSaving}>
												Guardar número
											</Button>
											<Button
												type="button"
												variant="secondary"
												onClick={() => {
													setPasswordMessage('')
													setPasswordOpen(true)
												}}
											>
												Alterar password
											</Button>
										</div>

										{phoneError ? <p className="account-error-message">{phoneError}</p> : null}
									</div>
								</article>
							</div>

							<div className="account-column">
								<article className="panel account-panel">
									<div className="account-panel-head">
										<div>
											<h3>Estatísticas</h3>
											<p>Resumo da tua atividade na plataforma.</p>
										</div>
									</div>

									<div className="account-stat-grid">
										{statCards.map((item) => (
											<div key={item.label} className="account-stat-card">
												<strong>{item.value}</strong>
												<span>{item.label}</span>
											</div>
										))}
									</div>
								</article>

								<article className="panel account-panel">
									<div className="account-panel-head">
										<div>
											<h3>Modalidades que leciono</h3>
											<p>Definidas pela direção. Informação apenas para consulta.</p>
										</div>
									</div>

									{modalities.length ? (
										<ul className="account-list">
											{modalities.map((m) => (
												<li key={m.modalityId}>
													<span>{m.modalityName}</span>
												</li>
											))}
										</ul>
									) : (
										<p className="account-empty">Ainda não há modalidades associadas.</p>
									)}
								</article>
							</div>
						</section>
					)}
				</main>
			</div>

			<Modal
				open={passwordOpen}
				onClose={closePasswordModal}
				title="Alterar password"
				description="Introduz a password atual e define uma nova password para a tua conta."
				size="sm"
			>
				<form className="account-modal-form" onSubmit={handlePasswordSubmit}>
					<Input
						label="Password atual"
						type="password"
						value={passwordForm.currentPassword}
						onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
						autoComplete="current-password"
					/>
					<Input
						label="Nova password"
						type="password"
						value={passwordForm.newPassword}
						onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
						autoComplete="new-password"
						helperText="A password deve ter pelo menos 8 caracteres."
					/>
					<Input
						label="Confirmar nova password"
						type="password"
						value={passwordForm.confirmPassword}
						onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
						autoComplete="new-password"
					/>

					{passwordError ? <p className="account-error-message">{passwordError}</p> : null}

					<div className="account-modal-actions">
						<Button type="button" variant="secondary" onClick={closePasswordModal}>
							Cancelar
						</Button>
						<Button type="submit" variant="cta" isLoading={passwordSaving}>
							Guardar nova password
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	)
}
