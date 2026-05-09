import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal component', () => {
  it('does not render when open is false', () => {
    render(<Modal open={false}>Content</Modal>)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders correctly when open is true', () => {
    render(
      <Modal open={true} title="Test Title" description="Test Description">
        Content
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose}>
        Content
      </Modal>
    )
    const closeBtn = screen.getByLabelText('Fechar modal')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
