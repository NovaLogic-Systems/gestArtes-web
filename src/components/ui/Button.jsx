/**
 * @file src/components/ui/Button.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { forwardRef } from 'react'
import { cn } from './shared'

const variantStyles = {
	primary: {
		background: 'var(--accent)',
		color: '#fff',
		borderColor: 'var(--accent)',
	},
	cta: {
		background: 'linear-gradient(135deg, #0b9d8f, #10b2a3)',
		color: '#fff',
		borderColor: 'transparent',
	},
	ctaSecondary: {
		background: 'linear-gradient(135deg, #55436d, #6a5490)',
		color: '#fff',
		borderColor: 'transparent',
	},
	secondary: {
		background: 'transparent',
		color: 'var(--text-h)',
		borderColor: 'var(--border)',
	},
	pill: {
		background: '#fff3ee',
		color: '#8c402a',
		borderColor: '#f2c2af',
	},
	ghost: {
		background: 'transparent',
		color: 'var(--text-h)',
		borderColor: 'transparent',
	},
	danger: {
		background: '#dc2626',
		color: '#fff',
		borderColor: '#dc2626',
	},
}

const sizeStyles = {
	sm: {
		padding: '0.5rem 0.75rem',
		fontSize: '0.875rem',
	},
	md: {
		padding: '0.75rem 1rem',
		fontSize: '0.95rem',
	},
	lg: {
		padding: '0.9rem 1.2rem',
		fontSize: '1rem',
	},
}

const Button = forwardRef(function Button(
	{
		as: Component = 'button',
		variant = 'primary',
		size = 'md',
		block = false,
		disabled = false,
		isLoading = false,
		leftIcon,
		rightIcon,
		className,
		type,
		onClick,
		style,
		children,
		...props
	},
	ref,
) {
	const isNativeButton = Component === 'button'
	const isDisabled = disabled || isLoading
	const baseStyle = {
		alignItems: 'center',
		appearance: 'none',
		borderRadius: '0.875rem',
		border: '1px solid transparent',
		cursor: isDisabled ? 'not-allowed' : 'pointer',
		display: 'inline-flex',
		fontFamily: 'var(--sans)',
		fontWeight: 600,
		gap: '0.5rem',
		justifyContent: 'center',
		lineHeight: 1.1,
		opacity: isDisabled ? 0.6 : 1,
		padding: '0.75rem 1rem',
		textDecoration: 'none',
		transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
		width: block ? '100%' : 'auto',
		...variantStyles[variant],
		...sizeStyles[size],
		...style,
	}

	return (
		<Component
			ref={ref}
			type={isNativeButton ? type ?? 'button' : undefined}
			disabled={isNativeButton ? isDisabled : undefined}
			aria-disabled={!isNativeButton && isDisabled ? 'true' : undefined}
			tabIndex={!isNativeButton && isDisabled ? -1 : props.tabIndex}
			className={cn('ui-button', className)}
			style={baseStyle}
			onClick={(event) => {
				if (!isNativeButton && isDisabled) {
					event.preventDefault()
					event.stopPropagation()
					return
				}

				onClick?.(event)
			}}
			{...props}
		>
			{isLoading && (
				<svg
					style={{ animation: 'spin 1s linear infinite', height: '1.2em', width: '1.2em' }}
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
					<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
				</svg>
			)}
			{!isLoading && leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
			<span>{children}</span>
			{!isLoading && rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
		</Component>
	)
})

export default Button
export { Button }
