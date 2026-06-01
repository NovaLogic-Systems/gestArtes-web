/**
 * @file src/pages/student/AccountPage.jsx
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
import { changeStudentPassword, fetchStudentAccount, updateStudentPhoneNumber } from '../../services/studentAccount'
import NotificationsBell from '../../components/NotificationsBell'
import './DashboardPage.css'
import './account.css'
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

function normalizePhoneNumber(value) {
	return String(value || '').trim()
}

function getInitials(profile) {
	const parts = [profile?.firstName, profile?.lastName].filter(Boolean)
	if (!parts.length) {
		return 'A'
	}

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

function splitPlanLabel(value) {
	const normalized = String(value || '').trim()
	if (!normalized) {
		return { name: '', level: '' }
	}

	const match = normalized.match(/^(.*?)(?:\s+(\d+))$/)
	if (!match) {
		return { name: normalized, level: '' }
	}

	return {
		name: match[1].trim() || normalized,
		level: match[2].trim(),
	}
}

export default function AccountPage() {
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
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Aluno'
	const profile = account?.profile ?? null
	const trainingPlan = account?.trainingPlan ?? null
	const statistics = account?.statistics ?? null
	const modalityDistribution = Array.isArray(trainingPlan?.modalityDistribution) ? trainingPlan.modalityDistribution : []
	const isModalityLocked = trainingPlan?.isModalityLocked ?? false
	const allowedModalities = Array.isArray(trainingPlan?.allowedModalities) ? trainingPlan.allowedModalities : []
	const normalizedPhone = normalizePhoneNumber(profile?.phoneNumber)
	const phoneDirty = normalizePhoneNumber(phoneNumber) !== normalizedPhone
	const trainingPlanLabel = splitPlanLabel(trainingPlan?.name)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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

	const loadAccount = useCallback(async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetchStudentAccount()
			setAccount(response)
			setPhoneNumber(normalizePhoneNumber(response?.profile?.phoneNumber))
		} catch (requestError) {
			setAccount(null)
			setPhoneNumber('')
			setError(localizeApiError(requestError, 'Não foi possível carregar a conta do aluno.'))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadAccount()
	}, [loadAccount])

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

	const statCards = useMemo(() => ([
		{ label: 'Sessões inscritas', value: formatCount(statistics?.totalSessionsEnrolled) },
		{ label: 'Sessões concluídas', value: formatCount(statistics?.completedSessions) },
		{ label: 'Pedidos de adesão', value: formatCount(statistics?.totalJoinRequests) },
		{ label: 'Requisições de inventário', value: formatCount(statistics?.totalInventoryRentals) },
		{ label: 'Compras no marketplace', value: formatCount(statistics?.totalMarketplacePurchases) },
	]), [statistics])

	const handlePhoneSave = async () => {
		if (!phoneDirty || phoneSaving) {
			return
		}

		try {
			setPhoneSaving(true)
			setPhoneError('')

			const response = await updateStudentPhoneNumber(phoneNumber)
			const nextProfile = response?.profile ?? null

			if (nextProfile) {
				setAccount((current) => (current ? { ...current, profile: nextProfile } : current))
				setPhoneNumber(normalizePhoneNumber(nextProfile.phoneNumber))
			}

			toast.success('Número de telemóvel atualizado com sucesso.')
		} catch (requestError) {
			setPhoneError(localizeApiError(requestError, 'Não foi possível atualizar o número de telemóvel.'))
		} finally {
			setPhoneSaving(false)
		}
	}

	const closePasswordModal = () => {
		setPasswordOpen(false)
		setPasswordError('')
		setPasswordForm({
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		})
	}

	const handlePasswordSubmit = async (event) => {
		event.preventDefault()

		if (passwordSaving) {
			return
		}

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setPasswordError('As passwords nova e de confirmação não coincidem.')
			return
		}

		try {
			setPasswordSaving(true)
			setPasswordError('')

			await changeStudentPassword({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword,
			})

			setPasswordMessage('Password atualizada com sucesso.')
			closePasswordModal()
			toast.success('Password atualizada com sucesso.')
		} catch (requestError) {
			setPasswordError(localizeApiError(requestError, 'Não foi possível alterar a password.'))
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
							<NotificationsBell pageLink="/student/notifications" />
						</div>
					</header>

					{error ? <p className="inventory-error-banner">{error}</p> : null}
					{passwordMessage ? <p className="account-success-banner">{passwordMessage}</p> : null}

					{loading ? (
						renderSkeleton()
					) : (
						<section className="account-layout">
							<div className="account-column">
								<article className="panel account-panel account-profile-panel">
									<div className="account-profile-header">
										<div className="account-avatar">
											{profile?.photoUrl ? <img src={profile.photoUrl} alt={`${profile.firstName} ${profile.lastName}`} /> : getInitials(profile)}
										</div>
										<div className="account-profile-copy">
											<p className="inventory-kicker">Perfil do estudante</p>
											<h3>{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}</h3>
											<div className="account-badges">
												<Badge variant="info" size="sm">{profile?.studentCode || 'ST-0000'}</Badge>
														<Badge variant="neutral" size="sm">{trainingPlanLabel.name || trainingPlan?.name || 'Plano por definir'}</Badge>
											</div>
										</div>
									</div>

									<div className="account-note">
										<p>Para alterar os teus dados pessoais contacta diretamente a escola.</p>
									</div>

									<div className="account-readonly-grid">
										<div className="account-readonly-item"><span>Primeiro nome</span><strong>{profile?.firstName || '—'}</strong></div>
										<div className="account-readonly-item"><span>Último nome</span><strong>{profile?.lastName || '—'}</strong></div>
										<div className="account-readonly-item"><span>Email</span><strong>{profile?.email || '—'}</strong></div>
										<div className="account-readonly-item"><span>Número de telemóvel</span><strong>{profile?.phoneNumber || '—'}</strong></div>
										<div className="account-readonly-item"><span>Data de nascimento</span><strong>{formatDateLabel(profile?.birthDate)}</strong></div>
										<div className="account-readonly-item"><span>Responsável</span><strong>{profile?.guardianName || '—'}</strong></div>
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
											value={phoneNumber}
											onChange={(event) => {
												setPhoneNumber(event.target.value)
																					setPhoneError('')
											}}
											helperText="Este número é usado para contacto operacional da escola."
											autoComplete="tel"
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
											<h3>Estatísticas da conta</h3>
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
											<h3>Plano formativo</h3>
											<p>Informação apenas para consulta.</p>
										</div>
									</div>

									<div className="account-plan-card">
										<div>
											<p className="account-plan-label">Plano atual</p>
											<h4>{trainingPlan?.name || 'Sem plano definido'}</h4>
										</div>
										<div className="account-plan-badges">
											{trainingPlanLabel.level ? <Badge variant="neutral" size="sm">Nível {trainingPlanLabel.level}</Badge> : null}
											<Badge variant="info" size="sm">{modalityDistribution.length} modalidade(s)</Badge>
										</div>
									</div>

									{modalityDistribution.length ? (
										<ul className="account-list">
											{modalityDistribution.map((item) => (
												<li key={item.modalityName}>
													<span>{item.modalityName}</span>
													<strong>{formatCount(item.sessions)}</strong>
												</li>
											))}
										</ul>
									) : (
										<p className="account-empty">Ainda não há sessões registadas.</p>
									)}

									<div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
										<p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-h)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
											Modalidades disponíveis para coaching
										</p>
										{isModalityLocked ? (
											allowedModalities.length > 0 ? (
												<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
													{allowedModalities.map((m) => (
														<Badge key={m.modalityId} variant="neutral" size="sm">{m.modalityName}</Badge>
													))}
												</div>
											) : (
												<p className="account-empty" style={{ margin: 0 }}>Nenhuma modalidade atribuída.</p>
											)
										) : (
											<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-h)" }}>Acesso livre a todas as modalidades.</p>
										)}
									</div>
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