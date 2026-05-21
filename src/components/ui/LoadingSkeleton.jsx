/**
 * @file src/components/ui/LoadingSkeleton.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { cn } from './shared'

function LoadingSkeleton({
	variant = 'text',
	lines = 1,
	width = '100%',
	height,
	radius,
	className,
	style,
}) {
	const entries = Array.from({ length: Math.max(1, lines) })

	return (
		<div className={cn('ui-skeleton', className)} style={{ display: 'grid', gap: '0.65rem', ...style }}>
			{entries.map((_, index) => {
				const computedHeight =
					height ?? (variant === 'circle' ? width : variant === 'block' ? '6rem' : '1rem')

				return (
					<span
						key={index}
						aria-hidden="true"
						style={{
							animation: 'ui-skeleton-pulse 1.6s linear infinite',
							background: 'linear-gradient(90deg, #f5f2f9 25%, #e8e2f0 50%, #f5f2f9 75%)',
							backgroundSize: '200% 100%',
							borderRadius:
								radius ?? (variant === 'circle' ? '999px' : variant === 'text' ? '0.5rem' : '0.9rem'),
							display: 'block',
							height: computedHeight,
							width: variant === 'circle' ? computedHeight : width,
						}}
					/>
				)
			})}
		</div>
	)
}

export default LoadingSkeleton
export { LoadingSkeleton }
