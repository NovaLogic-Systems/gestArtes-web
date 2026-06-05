/**
 * @file src/components/ProtectedRoute.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDashboardPath, hasRoleAccess, normalizeRoleList, toAppRole } from '../utils/roles'

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation()
  const { loading, isAuthenticated, role } = useAuth()
  const currentRole = toAppRole(role)
  const from = `${location.pathname}${location.search}${location.hash}`
  const normalizedAllowedRoles = normalizeRoleList(allowedRoles)

  if (loading) {
    return <div>A carregar sessão...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (normalizedAllowedRoles.length && !hasRoleAccess(currentRole, normalizedAllowedRoles)) {
    return <Navigate to={getDashboardPath(currentRole)} replace state={{ from, role: currentRole, allowedRoles: normalizedAllowedRoles }} />
  }

  return <Outlet />
}
