import { createElement } from 'react'
import WithRole from './WithRole'

export default function withRole(Component, roles = [], fallback = null) {
  function RoleProtectedComponent(props) {
    return createElement(
      WithRole,
      { roles, fallback },
      createElement(Component, props)
    )
  }

  const componentName = Component.displayName || Component.name || 'Component'
  RoleProtectedComponent.displayName = `withRole(${componentName})`

  return RoleProtectedComponent
}
