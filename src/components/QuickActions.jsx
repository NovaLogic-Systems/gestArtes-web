import { Link } from 'react-router-dom'
import Button from './ui/Button'

function QuickActions({ actions = [] }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
      }}
    >
      {actions.map((action) => (
        <Button
          key={action.key ?? action.to ?? action.label}
          as={Link}
          to={action.to}
          variant={action.variant ?? 'cta'}
          block
          style={{
            alignItems: 'start',
            boxShadow: 'none',
            display: 'grid',
            gap: '0.2rem',
            justifyItems: 'start',
            minHeight: '5.5rem',
            padding: '1rem',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'grid', gap: '0.2rem' }}>
            <strong style={{ fontSize: '1rem', lineHeight: 1.15 }}>{action.label}</strong>
            {action.description ? (
              <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.35, opacity: 0.9 }}>
                {action.description}
              </span>
            ) : null}
          </span>
        </Button>
      ))}
    </div>
  )
}

export default QuickActions
export { QuickActions }