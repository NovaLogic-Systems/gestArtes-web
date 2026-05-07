/**
 * @file src/components/QuickActions.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { Link } from 'react-router-dom'
import Button from './ui/Button'

function QuickActions({ actions = [] }) {
  const safeActions = actions.filter(
    (action) => action && (typeof action.to === 'string' || typeof action.href === 'string' || typeof action.onClick === 'function'),
  )

  return (
    <div
      style={{
        display: 'grid',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
      }}
    >
      {safeActions.map((action) => {
        const sharedProps = {
          key: action.key ?? action.to ?? action.href ?? action.label,
          variant: action.variant ?? 'cta',
          block: true,
          style: {
            alignItems: 'start',
            boxShadow: 'none',
            display: 'grid',
            gap: '0.2rem',
            justifyItems: 'start',
            minHeight: '5.5rem',
            padding: '1rem',
            textAlign: 'left',
          },
        }

        if (typeof action.to === 'string') {
          return (
            <Button {...sharedProps} as={Link} to={action.to}>
              <span style={{ display: 'grid', gap: '0.2rem' }}>
                <strong style={{ fontSize: '1rem', lineHeight: 1.15 }}>{action.label}</strong>
                {action.description ? (
                  <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.35, opacity: 0.9 }}>
                    {action.description}
                  </span>
                ) : null}
              </span>
            </Button>
          )
        }

        if (typeof action.href === 'string') {
          return (
            <Button {...sharedProps} as="a" href={action.href}>
              <span style={{ display: 'grid', gap: '0.2rem' }}>
                <strong style={{ fontSize: '1rem', lineHeight: 1.15 }}>{action.label}</strong>
                {action.description ? (
                  <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.35, opacity: 0.9 }}>
                    {action.description}
                  </span>
                ) : null}
              </span>
            </Button>
          )
        }

        return (
          <Button {...sharedProps} type="button" onClick={action.onClick}>
            <span style={{ display: 'grid', gap: '0.2rem' }}>
              <strong style={{ fontSize: '1rem', lineHeight: 1.15 }}>{action.label}</strong>
              {action.description ? (
                <span style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.35, opacity: 0.9 }}>
                  {action.description}
                </span>
              ) : null}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

export default QuickActions
export { QuickActions }