import { createPortal } from 'react-dom'
import { cn } from './shared'

const toastVariants = {
	info: { accent: 'var(--accent)', background: 'var(--bg)' },
	success: { accent: '#16a34a', background: 'var(--bg)' },
	warning: { accent: '#f97316', background: 'var(--bg)' },
	danger: { accent: '#dc2626', background: 'var(--bg)' },
}

function Toast({
	open = true,
	variant = 'info',
	title,
	description,
	actionLabel,
	onAction,
	onClose,
	className,
	style,
	children,
}) {
	if (!open) {
		return null
	}

	const content = (
		<div
			className={cn('ui-toast', className)}
			role="alert"
			style={{
				alignItems: 'start',
				background: toastVariants[variant].background,
				border: `1px solid ${toastVariants[variant].accent}`,
				borderRadius: '1rem',
				boxShadow: 'var(--shadow)',
				color: 'var(--text-h)',
				display: 'grid',
				gap: '0.75rem',
				maxWidth: '24rem',
				padding: '1rem',
				...style,
			}}
		>
			<div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
				<div style={{ display: 'grid', gap: '0.25rem' }}>
					{title ? <strong style={{ color: toastVariants[variant].accent }}>{title}</strong> : null}
					{description ? <span style={{ color: 'var(--text)' }}>{description}</span> : null}
				</div>

				{onClose ? (
					<button
						type="button"
						onClick={onClose}
						aria-label="Fechar notificação"
						style={{
							background: 'transparent',
							border: 0,
							color: 'var(--text)',
							cursor: 'pointer',
							fontSize: '1.25rem',
							lineHeight: 1,
							padding: 0,
						}}
					>
						×
					</button>
				) : null}
			</div>

			{children}

			{actionLabel ? (
				<div>
					<button
						type="button"
						onClick={onAction}
						style={{
							background: toastVariants[variant].accent,
							border: 'none',
							borderRadius: '0.75rem',
							color: '#fff',
							cursor: 'pointer',
							font: 'inherit',
							fontWeight: 600,
							padding: '0.6rem 0.9rem',
						}}
					>
						{actionLabel}
					</button>
				</div>
			) : null}
		</div>
	)

	if (typeof document === 'undefined') {
		return content
	}

	return createPortal(content, document.body)
}

export default Toast
export { Toast }
