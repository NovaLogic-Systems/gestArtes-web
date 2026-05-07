/**
 * @file src/components/ui/Badge.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { forwardRef } from 'react'
import { cn } from './shared'

const badgeVariants = {
	neutral: {
		background: 'var(--social-bg)',
		color: 'var(--text-h)',
		borderColor: 'var(--border)',
	},
	success: {
		background: 'rgba(34, 197, 94, 0.12)',
		color: '#15803d',
		borderColor: 'rgba(34, 197, 94, 0.25)',
	},
	warning: {
		background: 'rgba(249, 115, 22, 0.14)',
		color: '#c2410c',
		borderColor: 'rgba(249, 115, 22, 0.25)',
	},
	danger: {
		background: 'rgba(220, 38, 38, 0.12)',
		color: '#b91c1c',
		borderColor: 'rgba(220, 38, 38, 0.25)',
	},
	info: {
		background: 'var(--accent-bg)',
		color: 'var(--accent)',
		borderColor: 'var(--accent-border)',
	},
}

const variantAliases = {
	ok: 'success',
	warn: 'warning',
	alert: 'danger',
}

const sizeStyles = {
	sm: {
		fontSize: '0.75rem',
		padding: '0.25rem 0.55rem',
	},
	md: {
		fontSize: '0.825rem',
		padding: '0.35rem 0.7rem',
	},
	lg: {
		fontSize: '0.9rem',
		padding: '0.45rem 0.85rem',
	},
}

const Badge = forwardRef(function Badge(
	{ variant = 'neutral', size = 'md', pill = true, className, style, children, ...props },
	ref,
) {
	const resolvedVariant = variantAliases[variant] ?? variant

	return (
		<span
			ref={ref}
			className={cn('ui-badge', className)}
			style={{
				alignItems: 'center',
				border: '1px solid transparent',
				borderRadius: pill ? '999px' : '0.75rem',
				display: 'inline-flex',
				fontWeight: 600,
				gap: '0.375rem',
				lineHeight: 1,
				whiteSpace: 'nowrap',
				...sizeStyles[size],
				...badgeVariants[resolvedVariant],
				...style,
			}}
			{...props}
		>
			{children}
		</span>
	)
})

export default Badge
export { Badge }
