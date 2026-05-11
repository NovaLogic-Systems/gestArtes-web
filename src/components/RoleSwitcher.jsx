/**
 * @file src/components/RoleSwitcher.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_LABELS = {
  student: 'Aluno',
  teacher: 'Professor',
  admin: 'Direção',
}

const ROLE_HOME = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
}

export default function RoleSwitcher({ className }) {
  const { role, roles, switchRole } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const [pendingNav, setPendingNav] = useState(null)

  useEffect(() => {
    if (pendingNav && role === pendingNav) {
      navigate(ROLE_HOME[role] || '/')
      setPendingNav(null)
    }
  }, [role, pendingNav, navigate])

  const handleSwitch = useCallback(async (nextRole) => {
    if (busy || nextRole === role) {
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      await switchRole(nextRole)
      setOpen(false)
      setPendingNav(nextRole)
    } finally {
      setBusy(false)
    }
  }, [busy, role, switchRole])

  if (!Array.isArray(roles) || roles.length < 2) {
    return null
  }

  return (
    <div ref={rootRef} className={`role-switcher${className ? ` ${className}` : ''}`} style={{ position: 'relative' }}>
      <button
        type="button"
        className="pill role-switcher-pill"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Mudar de papel"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#fff',
          border: '1px solid var(--studio-line, #e2d9eb)',
          padding: '6px 12px',
          borderRadius: '999px',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '0.85rem' }}>👤</span>
        <span>{ROLE_LABELS[role] || role}</span>
        <span aria-hidden="true" style={{ fontSize: '0.7rem', opacity: 0.6 }}>▾</span>
      </button>

      {open ? (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            margin: 0,
            padding: '6px',
            listStyle: 'none',
            background: '#fff',
            border: '1px solid var(--studio-line, #e2d9eb)',
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(20, 14, 30, 0.18)',
            zIndex: 60,
            minWidth: '160px',
          }}
        >
          {roles.map((r) => {
            const isActive = r === role
            return (
              <li key={r}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSwitch(r)}
                  disabled={busy}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    background: isActive ? '#f5edfb' : 'transparent',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: isActive ? 700 : 500,
                    color: '#1f1c2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span>{ROLE_LABELS[r] || r}</span>
                  {isActive ? <span aria-hidden="true" style={{ color: '#0b9d8f' }}>✓</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
