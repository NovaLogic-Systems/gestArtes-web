/**
 * @file src/context/AuthContext.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import api, {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const clearSession = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setRole(null)
    setIsAuthenticated(false)
    setUnreadCount(0)
  }, [])

  const loadSession = useCallback(async () => {
    setLoading(true)

    try {
      let response

      try {
        response = await api.get('/auth/me', { skipAuthHandler: true })
      } catch {
        const refreshResponse = await api.post('/auth/refresh', null, { skipAuthHandler: true })
        setAccessToken(refreshResponse.data?.accessToken)
        response = refreshResponse
      }

      const currentUser = response.data?.user ?? response.data ?? null
      const currentRole = response.data?.role ?? currentUser?.role ?? null

      setUser(currentUser)
      setRole(currentRole)
      setIsAuthenticated(Boolean(currentUser && currentRole))
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  const login = useCallback(async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password }, { skipAuthHandler: true })
    const currentUser = response.data?.user ?? null
    const currentRole = response.data?.role ?? currentUser?.role ?? null

    setAccessToken(response.data?.accessToken)
    setUser(currentUser)
    setRole(currentRole)
    setIsAuthenticated(Boolean(currentUser && currentRole))

    return currentUser
  }, [])

  const switchRole = useCallback(async (nextRole) => {
    const response = await api.post('/auth/switch-role', { role: nextRole })
    const currentUser = response.data?.user ?? null
    const currentRole = response.data?.role ?? currentUser?.role ?? null

    if (response.data?.accessToken) {
      setAccessToken(response.data.accessToken)
    }
    setUser(currentUser)
    setRole(currentRole)
    setIsAuthenticated(Boolean(currentUser && currentRole))

    return currentRole
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { skipAuthHandler: true })
    } catch {
      // Even if the backend session is already invalid, clear local auth state.
    }

    clearSession()
  }, [clearSession])

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      return
    }

    void loadSession()
  }, [loadSession])

  useEffect(() => {
    const onUnauthorized = () => {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    setUnauthorizedHandler(onUnauthorized)

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return undefined
    }

    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: {
        token: getAccessToken(),
      },
    })

    socket.on('notification', (data) => {
      if (data.recipientId === user.id) {
        setUnreadCount((prev) => prev + 1)
        toast(data.message)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user?.id])

  const value = useMemo(
    () => ({
      user,
      role,
      roles: Array.isArray(user?.roles) ? user.roles : (role ? [role] : []),
      isAuthenticated,
      loading,
      login,
      logout,
      switchRole,
      reloadSession: loadSession,
      loadSession,
      unreadCount,
      setUnreadCount,
    }),
    [user, role, isAuthenticated, loading, login, logout, switchRole, loadSession, unreadCount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
