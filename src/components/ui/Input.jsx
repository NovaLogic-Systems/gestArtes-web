/**
 * @file src/components/ui/Input.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { forwardRef, useId } from 'react'
import { cn } from './shared'

const Input = forwardRef(function Input(
	{
		label,
		helperText,
		error,
		id,
		className,
		containerClassName,
		leading,
		trailing,
		fullWidth = true,
		style,
		inputStyle,
		...props
	},
	ref,
) {
	const generatedId = useId()
	const inputId = id ?? generatedId
	const hintId = helperText ? `${inputId}-help` : undefined
	const errorId = error ? `${inputId}-error` : undefined

	return (
		<label
			htmlFor={inputId}
			className={cn('ui-input', containerClassName)}
			style={{ display: 'grid', gap: '0.45rem', width: fullWidth ? '100%' : 'auto', ...style }}
		>
			{label ? (
				<span style={{ color: 'var(--text-h)', fontSize: '0.95rem', fontWeight: 600 }}>
					{label}
				</span>
			) : null}

			<span
				style={{
					alignItems: 'center',
					background: 'var(--bg)',
					border: `1px solid ${error ? '#dc2626' : 'var(--border)'}`,
					borderRadius: '0.875rem',
					display: 'flex',
					gap: '0.75rem',
					padding: '0.75rem 0.9rem',
					transition: 'border-color 160ms ease, box-shadow 160ms ease',
				}}
			>
				{leading ? <span aria-hidden="true">{leading}</span> : null}
				<input
					ref={ref}
					id={inputId}
					aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
					aria-invalid={error ? 'true' : undefined}
					className={cn('ui-input-field', className)}
					style={{
						background: 'transparent',
						border: 0,
						color: 'var(--text-h)',
						flex: 1,
						font: 'inherit',
						minWidth: 0,
						outline: 'none',
						width: '100%',
						...inputStyle,
					}}
					{...props}
				/>
				{trailing ? <span aria-hidden="true">{trailing}</span> : null}
			</span>

			{helperText ? (
				<span id={hintId} style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
					{helperText}
				</span>
			) : null}

			{error ? (
				<span id={errorId} style={{ color: '#dc2626', fontSize: '0.875rem' }}>
					{error}
				</span>
			) : null}
		</label>
	)
})

export default Input
export { Input }
