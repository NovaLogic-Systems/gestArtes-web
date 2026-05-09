import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useAuth } from './useAuth'
import { AuthContext } from '../context/auth-context'

describe('useAuth hook', () => {
  it('throws an error if used outside of AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    consoleSpy.mockRestore()
  })

  it('returns context value when used within AuthProvider', () => {
    const mockContextValue = { user: { id: 1, name: 'Test User' }, login: vi.fn() }
    const wrapper = ({ children }) => (
      <AuthContext.Provider value={mockContextValue}>
        {children}
      </AuthContext.Provider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current).toBe(mockContextValue)
  })
})
