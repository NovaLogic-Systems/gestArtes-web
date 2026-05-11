import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NotificationsBell from './NotificationsBell'
import notificationService from '../services/notificationService'

vi.mock('../services/notificationService', () => ({
  default: {
    list: vi.fn(),
    markAsRead: vi.fn()
  },
  formatNotificationDate: vi.fn(() => 'Mock Date')
}))

vi.mock('../services/realtimeNotifications', () => ({
  subscribeToNotifications: vi.fn(() => vi.fn())
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, role: null, roles: [], loading: false, switchRole: vi.fn() }))
}))

describe('NotificationsBell component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationService.list.mockResolvedValue([])
  })

  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <NotificationsBell />
      </MemoryRouter>
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens popover and fetches notifications on click', async () => {
    notificationService.list.mockResolvedValue([
      { id: 1, title: 'Test Alert', message: 'Test Msg', isRead: false, createdAt: new Date() }
    ])

    render(
      <MemoryRouter>
        <NotificationsBell />
      </MemoryRouter>
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Test Alert')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Test Msg')).toBeInTheDocument()
  })
})
