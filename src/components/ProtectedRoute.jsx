import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { toAppRole } from '../utils/roles'

export default function ProtectedRoute({ allowedRoles }) {
  const { loading, isAuthenticated, role } = useAuth()
  const currentRole = toAppRole(role)
  const normalizedAllowedRoles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map((entry) => toAppRole(entry))
    .filter(Boolean)

  if (loading) {
    return <div>A carregar sessão...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (normalizedAllowedRoles.length && !normalizedAllowedRoles.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
