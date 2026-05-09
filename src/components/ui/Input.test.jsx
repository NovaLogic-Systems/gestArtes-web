import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'

describe('Input component', () => {
  it('renders label and input correctly', () => {
    render(<Input label="Username" placeholder="Enter username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
  })

  it('renders helper text', () => {
    render(<Input label="Email" helperText="We will never share your email." />)
    expect(screen.getByText('We will never share your email.')).toBeInTheDocument()
  })

  it('renders error message and sets aria-invalid', () => {
    render(<Input label="Name" error="Name is required" />)
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders leading and trailing elements', () => {
    render(
      <Input
        label="Amount"
        leading={<span data-testid="leading">$</span>}
        trailing={<span data-testid="trailing">.00</span>}
      />
    )
    expect(screen.getByTestId('leading')).toBeInTheDocument()
    expect(screen.getByTestId('trailing')).toBeInTheDocument()
  })
})
