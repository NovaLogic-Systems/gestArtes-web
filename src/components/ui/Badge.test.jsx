import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge component', () => {
  it('renders children correctly', () => {
    render(<Badge>New Status</Badge>)
    expect(screen.getByText('New Status')).toBeInTheDocument()
  })

  it('renders as non-pill when pill is false', () => {
    render(<Badge pill={false} data-testid="badge-square">Square</Badge>)
    const badge = screen.getByTestId('badge-square')
    expect(badge.style.borderRadius).toBe('0.75rem')
  })
})
