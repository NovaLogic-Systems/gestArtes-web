import { forwardRef } from 'react'
import { cn } from './shared'

const KPICard = forwardRef(function KPICard(
	{
		title,
		value,
		description,
		footer,
		trend,
		icon,
		accent = 'var(--accent)',
		className,
		style,
		children,
		...props
	},
	ref,
) {
	return (
		<article
			ref={ref}
			className={cn('ui-kpi-card', className)}
			style={{
				background: 'var(--bg)',
				border: '1px solid var(--border)',
				borderRadius: '1.25rem',
				boxShadow: 'var(--shadow)',
				display: 'grid',
				gap: '1rem',
				padding: '1.15rem',
				position: 'relative',
				...style,
			}}
			{...props}
		>
			<div style={{ alignItems: 'start', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
				<div style={{ display: 'grid', gap: '0.35rem' }}>
					{title ? (
						<div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>{title}</div>
					) : null}
					<div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
						{value}
					</div>
				</div>

				{icon ? (
					<div
						aria-hidden="true"
						style={{
							alignItems: 'center',
							background: 'var(--accent-bg)',
							borderRadius: '0.9rem',
							color: accent,
							display: 'inline-flex',
							height: '2.8rem',
							justifyContent: 'center',
							width: '2.8rem',
						}}
					>
						{icon}
					</div>
				) : null}
			</div>

			{description || trend ? (
				<div style={{ display: 'grid', gap: '0.35rem' }}>
					{description ? <p style={{ color: 'var(--text)' }}>{description}</p> : null}
					{trend ? <p style={{ color: accent, fontWeight: 600 }}>{trend}</p> : null}
				</div>
			) : null}

			{children}

			{footer ? <footer style={{ color: 'var(--text)', fontSize: '0.875rem' }}>{footer}</footer> : null}
		</article>
	)
})

export default KPICard
export { KPICard }
