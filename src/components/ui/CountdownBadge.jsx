/**
 * @file src/components/ui/CountdownBadge.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import Badge from './Badge'

function CountdownBadge({ value, label, tone = 'info', className, ...props }) {
	return (
		<Badge variant={tone} className={className} {...props}>
			<span style={{ display: 'grid', gap: '0.1rem', textAlign: 'left' }}>
				{label ? <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{label}</span> : null}
				<span>{value}</span>
			</span>
		</Badge>
	)
}

export default CountdownBadge
export { CountdownBadge }
