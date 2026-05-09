import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)
    fireEvent.click(screen.getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Click Me</Button>)
    fireEvent.click(screen.getByText('Click Me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders as different component when "as" prop is provided', () => {
    render(<Button as="a" href="/test">Link Button</Button>)
    const link = screen.getByText('Link Button').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('renders left and right icons', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon" />} rightIcon={<span data-testid="right-icon" />}>
        Icon Button
      </Button>
    )
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })
})
