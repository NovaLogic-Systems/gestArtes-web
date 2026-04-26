import { useAuth } from '../hooks/useAuth'
import { hasRoleAccess, toAppRole } from '../utils/roles'

export default function WithRole({ roles = [], children, fallback = null }) {
  const { role, user } = useAuth()
  const currentRole = toAppRole(role || user?.role)
  if (hasRoleAccess(currentRole, roles)) {
    return children ?? null
  }

  return fallback
}
