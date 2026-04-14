import { cn } from '../ui/shared'

function Sidebar({
	brand,
	groups = [],
	footer,
	collapsed = false,
	isMobile = false,
	mobileOpen = false,
	onClose,
	onItemClick,
	width = 290,
	className,
	style,
}) {
	const content = (
		<aside
			className={cn('layout-sidebar', className)}
			aria-label="Navegação lateral"
			style={{
				background: 'rgba(255, 255, 255, 0.85)',
				backdropFilter: 'blur(6px)',
				borderRight: '1px solid var(--border)',
				display: 'grid',
				gap: '1rem',
				gridTemplateRows: 'auto 1fr auto',
				height: isMobile ? '100vh' : '100%',
				padding: '1rem',
				width: collapsed ? '5rem' : `${width}px`,
				...style,
			}}
		>
			<div style={{ alignItems: 'center', display: 'flex', gap: '0.625rem', minHeight: '2.5rem' }}>
				{brand?.icon ? (
					<span aria-hidden="true" style={{ display: 'inline-flex' }}>
						{brand.icon}
					</span>
				) : (
					<span
						aria-hidden="true"
						style={{
							background: 'linear-gradient(135deg, #0b9d8f, #f08a5d)',
							borderRadius: '999px',
							display: 'inline-block',
							height: '0.75rem',
							width: '0.75rem',
						}}
					/>
				)}

				{!collapsed ? (
					<div style={{ minWidth: 0 }}>
						<strong style={{ color: 'var(--text-h)', display: 'block', lineHeight: 1.15 }}>
							{brand?.title ?? 'gestArtes'}
						</strong>
						{brand?.subtitle ? (
							<small style={{ color: 'var(--text)', display: 'block', marginTop: '0.1rem' }}>
								{brand.subtitle}
							</small>
						) : null}
					</div>
				) : null}
			</div>

			<nav aria-label="Navegação principal" style={{ overflowY: 'auto' }}>
				{groups.map((group, groupIndex) => (
					<section key={group.id ?? group.label ?? groupIndex} style={{ marginBottom: '0.875rem' }}>
						{!collapsed && group.label ? (
							<h2
								style={{
									color: '#5f5480',
									fontSize: '0.75rem',
									letterSpacing: '0.08em',
									margin: '0 0.5rem 0.375rem',
									textTransform: 'uppercase',
								}}
							>
								{group.label}
							</h2>
						) : null}

						<div style={{ display: 'grid', gap: '0.25rem' }}>
							{(group.items ?? []).map((item, itemIndex) => {
								const key = item.id ?? item.href ?? item.label ?? itemIndex
								const isActive = Boolean(item.active)

								return (
									<a
										key={key}
										href={item.href ?? '#'}
										onClick={(event) => {
											if (item.disabled) {
												event.preventDefault()
												return
											}

											onItemClick?.({ item, event })
										}}
										aria-current={isActive ? 'page' : undefined}
										aria-disabled={item.disabled ? 'true' : undefined}
										title={collapsed ? item.label : undefined}
										style={{
											alignItems: 'center',
											background: isActive ? 'var(--accent-bg)' : 'transparent',
											borderRadius: '0.625rem',
											color: item.disabled ? 'var(--text)' : 'var(--text-h)',
											display: 'flex',
											gap: '0.55rem',
											opacity: item.disabled ? 0.55 : 1,
											padding: '0.56rem 0.625rem',
											textDecoration: 'none',
										}}
									>
										{item.icon ? (
											<span aria-hidden="true" style={{ display: 'inline-flex', flex: '0 0 auto' }}>
												{item.icon}
											</span>
										) : null}

										{!collapsed ? (
											<>
												<span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
												{item.badge != null ? (
													<span
														style={{
															background: 'var(--social-bg)',
															border: '1px solid var(--border)',
															borderRadius: '999px',
															fontSize: '0.75rem',
															fontWeight: 600,
															padding: '0.15rem 0.45rem',
														}}
													>
														{item.badge}
													</span>
												) : null}
											</>
										) : null}
									</a>
								)
							})}
						</div>
					</section>
				))}
			</nav>

			{footer ? <div>{footer}</div> : <div />}
		</aside>
	)

	if (!isMobile) {
		return content
	}

	return (
		<>
			{mobileOpen ? (
				<button
					type="button"
					onClick={onClose}
					aria-label="Fechar navegação lateral"
					style={{
						background: 'rgba(8, 6, 13, 0.4)',
						border: 0,
						inset: 0,
						position: 'fixed',
						zIndex: 30,
					}}
				/>
			) : null}

			<div
				style={{
					left: 0,
					position: 'fixed',
					top: 0,
					transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
					transition: 'transform 220ms ease',
					zIndex: 40,
				}}
			>
				{content}
			</div>
		</>
	)
}

export default Sidebar
export { Sidebar }
