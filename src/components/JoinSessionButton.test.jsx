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

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api')
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    getAccessToken: vi.fn().mockReturnValue('test-token'),
  }
})

import api from '../services/api'

describe('JoinSessionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when sessionStatus is Cancelled', async () => {
    const { container } = render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Cancelled"
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
      expect(screen.getByText('Aderir')).toBeInTheDocument()
    })
    expect(screen.getByText(/3 vagas livres/)).toBeInTheDocument()
  })

  it('renders the join button when session is Pending_Approval with spots', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Pending_Approval"
        availableSpots={2}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Aderir')).toBeInTheDocument()
    })
  })

  it('renders nothing when the session already started', async () => {
    const { container } = render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        sessionStartTime="2026-05-10T10:00:00.000Z"
        availableSpots={2}
      />
    )

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('shows enrolled badge and hides join button when the student is already enrolled', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        sessionStartTime="2026-05-20T10:00:00.000Z"
        availableSpots={2}
        userIsEnrolled
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Já inscrito')).toBeInTheDocument()
    })
    expect(screen.queryByText('Aderir')).not.toBeInTheDocument()
  })

  it('opens confirmation modal when join button is clicked', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={2}
      />
    )
    await waitFor(() => expect(screen.getByText('Aderir')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Aderir'))
    expect(screen.getByText('Confirmar adesão')).toBeInTheDocument()
    expect(screen.getByText(/Pretendes aderir a esta sessão/)).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByText('Aderir')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Aderir'))
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/coaching/sessions/5/join-requests')
      expect(screen.getByText('Aguarda professor')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByText('Aderir')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Aderir'))
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending_teacher' }))
    })
  })

  it('shows existing request status badge when initialRequestStatus is provided', async () => {
    render(
      <JoinSessionButton
        sessionId={10}
        sessionStatus="Approved"
        availableSpots={3}
        initialRequestStatus="approved"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Aprovado')).toBeInTheDocument()
    })
    expect(screen.queryByText('Aderir')).not.toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', async () => {
    render(
      <JoinSessionButton
        sessionId={1}
        sessionStatus="Approved"
        availableSpots={2}
      />
    )
    await waitFor(() => expect(screen.getByText('Aderir')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Aderir'))
    expect(screen.getByText('Confirmar adesão')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))
    await waitFor(() => {
      expect(screen.queryByText('Confirmar adesão')).not.toBeInTheDocument()
    })
  })
})
