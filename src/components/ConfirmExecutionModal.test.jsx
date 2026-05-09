/**
 * @file src/components/ConfirmExecutionModal.test.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ConfirmExecutionModal from './ConfirmExecutionModal'

// Mock the coaching service
vi.mock('../services/coaching', () => ({
  confirmCompletion: vi.fn(),
}))

import { confirmCompletion } from '../services/coaching'

const mockSession = {
  sessionId: 42,
  startTime: '2026-05-10T10:00:00.000Z',
  studioName: 'Estúdio A',
}

describe('ConfirmExecutionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when open is false', () => {
    render(
      <ConfirmExecutionModal
        open={false}
        session={mockSession}
        onClose={vi.fn()}
        onConfirmed={vi.fn()}
      />
    )
    expect(screen.queryByText('Confirmar execução da sessão')).not.toBeInTheDocument()
  })

  it('renders the modal with session info when open', () => {
    render(
      <ConfirmExecutionModal
        open={true}
        session={mockSession}
        onClose={vi.fn()}
        onConfirmed={vi.fn()}
      />
    )
    expect(screen.getByText('Confirmar execução da sessão')).toBeInTheDocument()
    expect(screen.getByText(/Esta sessão teve lugar/)).toBeInTheDocument()
    expect(screen.getByText(/Sessão #42/)).toBeInTheDocument()
    expect(screen.getByText(/Estúdio A/)).toBeInTheDocument()
  })

  it('calls onConfirmed and onClose on successful confirmation', async () => {
    confirmCompletion.mockResolvedValueOnce({ success: true })
    const onConfirmed = vi.fn()
    const onClose = vi.fn()

    render(
      <ConfirmExecutionModal
        open={true}
        session={mockSession}
        onClose={onClose}
        onConfirmed={onConfirmed}
      />
    )

    fireEvent.click(screen.getByTestId('confirm-exec-ok'))

    await waitFor(() => {
      expect(confirmCompletion).toHaveBeenCalledWith(42)
      expect(onConfirmed).toHaveBeenCalledWith(42)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error message when confirmation fails', async () => {
    confirmCompletion.mockRejectedValueOnce({
      response: { data: { error: 'Sessão não encontrada.' } },
    })
    const onConfirmed = vi.fn()
    const onClose = vi.fn()

    render(
      <ConfirmExecutionModal
        open={true}
        session={mockSession}
        onClose={onClose}
        onConfirmed={onConfirmed}
      />
    )

    fireEvent.click(screen.getByTestId('confirm-exec-ok'))

    await waitFor(() => {
      expect(screen.getByText('Sessão não encontrada.')).toBeInTheDocument()
    })
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ConfirmExecutionModal
        open={true}
        session={mockSession}
        onClose={onClose}
        onConfirmed={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
