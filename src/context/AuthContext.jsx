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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setRole(null)
    setIsAuthenticated(false)
  }, [])

  const loadSession = useCallback(async () => {
    setLoading(true)

    try {
      const response = await api.get('/auth/me')
      const currentUser = response.data?.user ?? response.data ?? null
      const currentRole = response.data?.role ?? currentUser?.role ?? null

      setUser(currentUser)
      setRole(currentRole)
      setIsAuthenticated(Boolean(currentUser && currentRole))
    } catch {
      // Se o access token expirou, o interceptor tenta refresh; se falhar,
      // limpamos estado local para evitar UI incoerente.
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  const login = useCallback(async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password }, { skipAuthHandler: true })
    const nextAccessToken = response.data?.accessToken ?? null
    const currentUser = response.data?.user ?? null
    const currentRole = response.data?.role ?? currentUser?.role ?? null

    setAccessToken(nextAccessToken)

    setUser(currentUser)
    setRole(currentRole)
    setIsAuthenticated(Boolean(currentUser && currentRole))

    return currentUser
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
    const token = getAccessToken()

    if (!token) {
      setLoading(false)
      return
    }

    loadSession()
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

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated,
      loading,
      login,
      logout,
      reloadSession: loadSession,
    }),
    [user, role, isAuthenticated, loading, login, logout, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
