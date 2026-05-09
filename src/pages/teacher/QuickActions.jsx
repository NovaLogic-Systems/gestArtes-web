const cta = {
	background: 'linear-gradient(135deg, #0b9d8f, #10b2a3)',
	borderRadius: '0.875rem',
	color: '#fff',
	cursor: 'pointer',
	display: 'block',
	fontFamily: 'inherit',
	fontSize: '1rem',
	fontWeight: 600,
	padding: '0.75rem 1rem',
	textAlign: 'center',
	textDecoration: 'none',
}

const ctaSecondary = {
	...cta,
	background: 'linear-gradient(135deg, #55436d, #6a5490)',
}

export default function QuickActions() {
	return (
		<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
			<a href="/teacher/availability" style={cta}>Submeter disponibilidade</a>
			<a href="/teacher/coaching" style={cta}>Confirmar conclusão</a>
			<a href="/teacher/coaching" style={{ ...ctaSecondary, gridColumn: 'span 2' }}>
				Registar falta sem aviso
			</a>
		</div>
	)
}
