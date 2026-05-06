/**
 * @file src/components/layout/Topbar.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { cn } from '../ui/shared'

function Topbar({
	title,
	subtitle,
	search,
	actions = [],
	startContent,
	endContent,
	onMenuToggle,
	menuLabel = 'Menu',
	sticky = false,
	className,
	style,
}) {
	return (
		<header
			className={cn('layout-topbar', className)}
			style={{
				alignItems: 'center',
				background: sticky ? 'color-mix(in srgb, var(--bg) 92%, white)' : 'transparent',
				backdropFilter: sticky ? 'blur(8px)' : 'none',
				display: 'flex',
				gap: '0.75rem',
				justifyContent: 'space-between',
				marginBottom: '0.875rem',
				padding: sticky ? '0.5rem 0' : 0,
				position: sticky ? 'sticky' : 'static',
				top: 0,
				zIndex: sticky ? 20 : 'auto',
				...style,
			}}
		>
			<div style={{ alignItems: 'start', display: 'grid', flex: 1, gap: '0.2rem' }}>
				<div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
					{onMenuToggle ? (
						<button
							type="button"
							onClick={onMenuToggle}
							style={{
								background: 'var(--bg)',
								border: '1px solid var(--border)',
								borderRadius: '0.65rem',
								color: 'var(--text-h)',
								cursor: 'pointer',
								font: 'inherit',
								fontWeight: 600,
								padding: '0.4rem 0.65rem',
							}}
						>
							{menuLabel}
						</button>
					) : null}

					<h2 style={{ color: 'var(--text-h)', margin: 0 }}>{title}</h2>
					{startContent}
				</div>

				{subtitle ? <p style={{ color: 'var(--text)', margin: 0 }}>{subtitle}</p> : null}
			</div>

			<div style={{ alignItems: 'center', display: 'flex', gap: '0.625rem' }}>
				{search?.visible ? (
					<label aria-label={search.label ?? 'Pesquisar'} style={{ display: 'inline-flex' }}>
						<input
							type={search.type ?? 'search'}
							value={search.value ?? ''}
							onChange={search.onChange}
							placeholder={search.placeholder ?? 'Pesquisar'}
							style={{
								background: 'var(--bg)',
								border: '1px solid var(--border)',
								borderRadius: '999px',
								color: 'var(--text-h)',
								font: 'inherit',
								minWidth: '12rem',
								padding: '0.5rem 0.85rem',
							}}
						/>
					</label>
				) : null}

				{actions.map((action, index) => (
					<button
						key={action.id ?? action.label ?? index}
						type={action.type ?? 'button'}
						onClick={action.onClick}
						disabled={action.disabled}
						style={{
							background: action.variant === 'accent' ? 'var(--accent-bg)' : 'var(--bg)',
							border: '1px solid var(--border)',
							borderRadius: '999px',
							color: 'var(--text-h)',
							cursor: action.disabled ? 'not-allowed' : 'pointer',
							font: 'inherit',
							fontWeight: 600,
							opacity: action.disabled ? 0.5 : 1,
							padding: '0.5rem 0.8rem',
							whiteSpace: 'nowrap',
						}}
					>
						{action.label}
					</button>
				))}

				{endContent}
			</div>
		</header>
	)
}

export default Topbar
export { Topbar }
