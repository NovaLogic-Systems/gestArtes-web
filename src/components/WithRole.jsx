import { useAuth } from '../hooks/useAuth'
import { toAppRole } from '../utils/roles'

export default function WithRole({ roles = [], children, fallback = null }) {
  const { role, user } = useAuth()
  const currentRole = toAppRole(role || user?.role)
  const allowedRoles = (Array.isArray(roles) ? roles : [roles])
    .map((entry) => toAppRole(entry))
    .filter(Boolean)

  if (!allowedRoles.length || allowedRoles.includes(currentRole)) {
    return children ?? null
  }

  return fallback
}
