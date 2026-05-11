/**
 * @file src/pages/student/MyHistoryPage.test.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MyHistoryPage from './MyHistoryPage'

// Mock coaching service
vi.mock('../../services/coaching', () => ({
  getSessionHistory: vi.fn(),
  confirmCompletion: vi.fn(),
}))

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'Ana', lastName: 'Silva' }, logout: vi.fn(), role: null, roles: [], switchRole: vi.fn() }),
}))

vi.mock('../../services/realtimeNotifications', () => ({
  subscribeToNotifications: vi.fn(() => vi.fn()),
}))

import { getSessionHistory, confirmCompletion } from '../../services/coaching'

const MOCK_SESSIONS = [
  {
    sessionId: 1,
    status: 'Approved',
    startTime: '2026-04-10T09:00:00.000Z',
    endTime: '2026-04-10T10:00:00.000Z',
    studioName: 'Estúdio A',
    modalityName: 'Dança Contemporânea',
    teachers: [{ name: 'Prof. João' }],
    finalPrice: null,
    coachingValue: 30,
    isPast: true,
    canConfirm: false,
    canCancel: false,
  },
  {
    sessionId: 2,
    status: 'Finalization_Validation_Pending',
    startTime: '2026-04-15T14:00:00.000Z',
    studioName: 'Estúdio B',
    modalityName: 'Teatro',
    teachers: [{ name: 'Prof. Maria' }],
    finalPrice: null,
    isPast: true,
    canConfirm: true,
    canCancel: false,
  },
  {
    sessionId: 3,
    status: 'Cancelled',
    startTime: '2026-03-01T10:00:00.000Z',
    studioName: 'Estúdio C',
    modalityName: 'Música',
    teachers: [{ name: 'Prof. Ana' }],
    finalPrice: 0,
    isPast: true,
    canConfirm: false,
    canCancel: false,
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <MyHistoryPage />
    </MemoryRouter>
  )
}

describe('MyHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeletons while fetching', () => {
    getSessionHistory.mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    // Skeletons are rendered as divs with class skeleton-row
    const skeletons = document.querySelectorAll('.skeleton-row')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders sessions table after loading', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('history-table')).toBeInTheDocument()
    })
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.getByText(/30,00/)).toBeInTheDocument()
    expect(screen.getByText('Sessões para confirmar conclusão')).toBeInTheDocument()
  })

  it('shows error banner when API call fails', async () => {
    getSessionHistory.mockRejectedValueOnce({
      response: { data: { error: 'Erro de servidor.' } },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Erro de servidor.')).toBeInTheDocument()
    })
  })

  it('filters sessions by search term', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    const searchInput = screen.getByTestId('history-search')
    fireEvent.change(searchInput, { target: { value: 'Teatro' } })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-list-btn-2')).toBeInTheDocument()
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
      expect(screen.queryByText('#3')).not.toBeInTheDocument()
    })
  })

  it('filters sessions by status', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    const statusSelect = screen.getByTestId('history-status-filter')
    fireEvent.change(statusSelect, { target: { value: 'awaitingConfirmation' } })

    await waitFor(() => {
      expect(screen.getAllByText('Aguarda confirmação').length).toBeGreaterThan(0)
      expect(screen.getByTestId('confirm-list-btn-2')).toBeInTheDocument()
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
      expect(screen.queryByText('#3')).not.toBeInTheDocument()
    })
  })

  it('filters sessions by date', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    const dateFilter = screen.getByTestId('history-date-filter')
    fireEvent.change(dateFilter, { target: { value: '2026-04-15' } })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-list-btn-2')).toBeInTheDocument()
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
      expect(screen.queryByText('#3')).not.toBeInTheDocument()
    })
  })

  it('shows Confirmar execução button for AwaitingCompletion sessions', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    expect(screen.queryByTestId('confirm-btn-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('confirm-list-btn-2')).toBeInTheDocument()
  })

  it('shows a dedicated confirmation section for pending sessions', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sessões para confirmar conclusão')).toBeInTheDocument()
    })

    expect(screen.getByTestId('confirm-list-btn-2')).toBeInTheDocument()
  })

  it('opens session detail modal on row click', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('history-row-1'))
    await waitFor(() => {
      expect(screen.getByText('Sessão #1')).toBeInTheDocument()
    })
  })

  it('opens confirm execution modal from the confirm button', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    confirmCompletion.mockResolvedValueOnce({})
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('confirm-list-btn-2'))
    await waitFor(() => {
      expect(screen.getByText('Confirmar execução da sessão')).toBeInTheDocument()
    })
  })

  it('shows empty state when no sessions match filters', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    const searchInput = screen.getByTestId('history-search')
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } })

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma sessão corresponde aos filtros/)).toBeInTheDocument()
    })
  })

  it('clears filters when clear button is clicked', async () => {
    getSessionHistory.mockResolvedValueOnce(MOCK_SESSIONS)
    renderPage()
    await waitFor(() => expect(screen.getByTestId('history-table')).toBeInTheDocument())

    const searchInput = screen.getByTestId('history-search')
    fireEvent.change(searchInput, { target: { value: 'Teatro' } })

    fireEvent.click(screen.getByText('Limpar'))

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('Sessão #2')).toBeInTheDocument()
      expect(screen.getByText('#3')).toBeInTheDocument()
    })
  })

  it('shows empty state when API returns no sessions', async () => {
    getSessionHistory.mockResolvedValueOnce([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Sem histórico de sessões para mostrar.')).toBeInTheDocument()
    })
  })
})
