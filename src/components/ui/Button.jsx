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
	const baseStyle = {
		alignItems: 'center',
		appearance: 'none',
		borderRadius: '0.875rem',
		border: '1px solid transparent',
		cursor: disabled ? 'not-allowed' : 'pointer',
		display: 'inline-flex',
		fontFamily: 'var(--sans)',
		fontWeight: 600,
		gap: '0.5rem',
		justifyContent: 'center',
		lineHeight: 1.1,
		opacity: disabled ? 0.6 : 1,
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
			disabled={isNativeButton ? disabled : undefined}
			aria-disabled={!isNativeButton && disabled ? 'true' : undefined}
			tabIndex={!isNativeButton && disabled ? -1 : props.tabIndex}
			className={cn('ui-button', className)}
			style={baseStyle}
			onClick={(event) => {
				if (!isNativeButton && disabled) {
					event.preventDefault()
					event.stopPropagation()
					return
				}

				onClick?.(event)
			}}
			{...props}
		>
			{leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
			<span>{children}</span>
			{rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
		</Component>
	)
})

export default Button
export { Button }
