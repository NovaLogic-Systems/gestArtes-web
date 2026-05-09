/**
 * @file src/components/WithRole.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

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
