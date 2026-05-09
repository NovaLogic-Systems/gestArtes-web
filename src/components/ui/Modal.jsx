/**
 * @file src/components/ui/Modal.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { cn } from './shared'

const sizeStyles = {
	sm: '28rem',
	md: '40rem',
	lg: '54rem',
	xl: '68rem',
}

function Modal({
	open = false,
	title,
	description,
	children,
	footer,
	size = 'md',
	closeOnBackdrop = true,
	onClose,
	className,
	style,
}) {
	useEffect(() => {
		if (!open || typeof document === 'undefined') {
			return undefined
		}

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				onClose?.()
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			document.body.style.overflow = previousOverflow
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [open, onClose])

	if (!open) {
		return null
	}

	const content = (
		<div
			onMouseDown={closeOnBackdrop ? onClose : undefined}
			style={{
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(8, 6, 13, 0.5)',
				inset: 0,
				display: 'flex',
				padding: '1.25rem',
				position: 'fixed',
				zIndex: 50,
				animation: 'backdrop-fade-in 150ms ease-out forwards',
			}}
		>
			<section
				aria-modal="true"
				role="dialog"
				onMouseDown={(event) => event.stopPropagation()}
				className={cn('ui-modal', className)}
				style={{
					background: 'var(--bg)',
					border: '1px solid var(--border)',
					borderRadius: '1.25rem',
					boxShadow: 'var(--shadow)',
					display: 'grid',
					gap: '1rem',
					colorScheme: 'light',
					maxHeight: 'calc(100vh - 2.5rem)',
					maxWidth: 'calc(100vw - 2.5rem)',
					overflow: 'auto',
					padding: '1.25rem',
					width: 'min(100%, ' + sizeStyles[size] + ')',
					animation: 'modal-fade-in 200ms ease-out forwards',
					...style,
				}}
			>
				<header style={{ display: 'grid', gap: '0.35rem' }}>
					<div style={{ alignItems: 'start', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
						<div style={{ display: 'grid', gap: '0.25rem' }}>
							{title ? <h2 style={{ margin: 0 }}>{title}</h2> : null}
							{description ? <p style={{ color: 'var(--text)' }}>{description}</p> : null}
						</div>
						{onClose ? (
							<button
								type="button"
								onClick={onClose}
								aria-label="Fechar modal"
								style={{
									background: 'transparent',
									border: 0,
									color: 'var(--text)',
									cursor: 'pointer',
									fontSize: '1.4rem',
									lineHeight: 1,
									padding: 0,
								}}
							>
								×
							</button>
						) : null}
					</div>
				</header>

				<div>{children}</div>

				{footer ? <footer>{footer}</footer> : null}
			</section>
		</div>
	)

	if (typeof document === 'undefined') {
		return content
	}

	return createPortal(content, document.body)
}

export default Modal
export { Modal }
