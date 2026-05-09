/**
 * @file src/components/JoinSessionButton.test.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JoinSessionButton from './JoinSessionButton'

// Mock socket.io-client to avoid real WebSocket connections
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

// Mock the network utils — spread all actual exports so api.js doesn't break
vi.mock('../utils/network', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSocketUrl: () => null, // disable socket in tests
  }
})

// Mock api module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api')
  return {
    ...actual,
    default: {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn(),
    },
    getAccessToken: vi.fn().mockReturnValue('test-token'),
  }
})

import api from '../services/api'

describe('JoinSessionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: [] })
  })

  it('renders nothing when sessionStatus is not Approved', async () => {
    const { container } = render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Pending"
        availableSpots={3}
      />
    )
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders nothing when there are no available spots', async () => {
    const { container } = render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={0}
      />
    )
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders the join button when session is Approved with spots', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={3}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Pedir adesão')).toBeInTheDocument()
    })
    expect(screen.getByText(/3 vagas livres/)).toBeInTheDocument()
  })

  it('opens confirmation modal when join button is clicked', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={2}
      />
    )
    await waitFor(() => expect(screen.getByText('Pedir adesão')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Pedir adesão'))
    expect(screen.getByText('Confirmar Adesão')).toBeInTheDocument()
    expect(screen.getByText(/Tem a certeza que deseja pedir adesão/)).toBeInTheDocument()
  })

  it('calls the join-requests API and shows pending badge on confirm', async () => {
    api.post.mockResolvedValueOnce({ data: { status: 'pending_teacher' } })

    render(
      <JoinSessionButton
        sessionId={5}
        sessionStatus="Approved"
        availableSpots={1}
      />
    )
    await waitFor(() => expect(screen.getByText('Pedir adesão')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Pedir adesão'))
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/coaching/sessions/5/join-requests')
      expect(screen.getByText('Pending Teacher')).toBeInTheDocument()
    })
  })

  it('calls onSuccess callback after successful join request', async () => {
    const onSuccess = vi.fn()
    api.post.mockResolvedValueOnce({ data: { status: 'pending_teacher' } })

    render(
      <JoinSessionButton
        sessionId={7}
        sessionStatus="Approved"
        availableSpots={2}
        onSuccess={onSuccess}
      />
    )
    await waitFor(() => expect(screen.getByText('Pedir adesão')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Pedir adesão'))
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ status: 'pending_teacher' })
    })
  })

  it('shows existing request status as badge from previous request', async () => {
    api.get.mockResolvedValueOnce({
      data: [{ sessionId: 10, status: 'approved' }],
    })

    render(
      <JoinSessionButton
        sessionId={10}
        sessionStatus="Approved"
        availableSpots={3}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })
    expect(screen.queryByText('Pedir adesão')).not.toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={2}
      />
    )
    await waitFor(() => expect(screen.getByText('Pedir adesão')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Pedir adesão'))
    expect(screen.getByText('Confirmar Adesão')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Adesão')).not.toBeInTheDocument()
    })
  })
})
