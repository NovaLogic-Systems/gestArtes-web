/**
 * @file src/pages/LoginPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDashboardPath, isPathAllowedForRole } from '../utils/roles'
import './auth.css'

const allowedReturnPrefixes = ['/student/', '/teacher/', '/admin/']

function getLoginNotice(search) {
  const params = new URLSearchParams(search)
  const reason = params.get('reason')

  if (reason === 'session-expired') {
    return 'A tua sessão expirou. Inicia sessão novamente.'
  }

  if (reason === 'logged-out') {
    return 'Sessão terminada com sucesso.'
  }

  return ''
}

function normalizeReturnPath(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const candidate = value.trim()

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('://') ||
    candidate.includes('\\')
  ) {
    return ''
  }

  try {
    const parsed = new URL(candidate, window.location.origin)

    if (parsed.origin !== window.location.origin) {
      return ''
    }

    if (!allowedReturnPrefixes.some((prefix) => parsed.pathname.startsWith(prefix))) {
      return ''
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return ''
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, role, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loginNotice = useMemo(() => getLoginNotice(location.search), [location.search])
  const returnPath = normalizeReturnPath(location.state?.from)

  function resolveNextPath(targetRole) {
    if (isPathAllowedForRole(targetRole, returnPath)) {
      return returnPath
    }

    return getDashboardPath(targetRole)
  }

  useEffect(() => {
    document.body.classList.add('auth-page')

    return () => {
      document.body.classList.remove('auth-page')
    }
  }, [])

  const canSubmit = useMemo(
    () => !submitting && email.trim().length > 0 && password.length > 0,
    [email, password, submitting],
  )

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(resolveNextPath(role), { replace: true })
    }
  }, [isAuthenticated, loading, navigate, returnPath, role])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const currentUser = await login({
        email: email.trim().toLowerCase(),
        password,
      })

      const nextRole = currentUser?.role || role
      navigate(resolveNextPath(nextRole), { replace: true })
    } catch (requestError) {
      const backendMessage = requestError?.response?.data?.error
      const message =
        backendMessage === 'Invalid credentials'
          ? 'Credenciais inválidas.'
          : backendMessage || 'Não foi possível autenticar.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <main className="auth-shell">
        <div aria-hidden="true" className="auth-orb auth-orb-a" />
        <div aria-hidden="true" className="auth-orb auth-orb-b" />

        <section className="auth-card auth-card-login" aria-labelledby="login-title">
          <div className="auth-login-brand">
            <h1 id="login-title" className="auth-title">
              gestArtes
            </h1>
            <p className="auth-copy">Plataforma de gestão escolar</p>
          </div>

          <div className="auth-login-form">
            {loginNotice ? (
              <p className="auth-status auth-status-info" role="status" aria-live="polite">
                {loginNotice}
              </p>
            ) : null}
            {error ? (
              <p className="auth-status auth-status-error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label" htmlFor="email">
                Email
              </label>
              <input
                className="auth-input"
                id="email"
                type="email"
                autoComplete="username"
                placeholder="nome@entartes.pt"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label className="auth-label" htmlFor="password">
                Palavra-passe
              </label>
              <div className="auth-password-field">
                <input
                  className="auth-input auth-input-password"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M3.98 8.223A14.7 14.7 0 0 1 12 5.75c4.2 0 8.13 2.22 10.7 6.12a1 1 0 0 1 0 1.11 15.8 15.8 0 0 1-3.28 3.75l-1.44-1.44a13.4 13.4 0 0 0 2.92-3.86C18.72 8.42 15.57 6.9 12 6.9c-1.68 0-3.31.37-4.79 1.03l-1.28-1.28c.56-.19 1.14-.3 1.73-.34l.32-.01-.01-.01ZM8.07 11.29a4.4 4.4 0 0 0-.16 1.16A4.09 4.09 0 0 0 12 16.5c.4 0 .79-.06 1.15-.17l1.62 1.62A6.1 6.1 0 0 1 12 18.7a6.08 6.08 0 0 1-6.07-6.08c0-1.04.25-2.03.7-2.9l1.44 1.57Z" />
                      <path d="m4.29 3.88 15.83 15.83-1.42 1.41L2.88 5.29l1.41-1.41Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 5.75c4.2 0 8.13 2.22 10.7 6.12a1 1 0 0 1 0 1.11C20.13 16.78 16.2 19 12 19S3.87 16.78 1.3 12.98a1 1 0 0 1 0-1.11C3.87 7.97 7.8 5.75 12 5.75Zm0 2.15c-3.34 0-6.43 1.62-8.57 4.53 2.14 2.91 5.23 4.52 8.57 4.52s6.43-1.61 8.57-4.52C18.43 9.52 15.34 7.9 12 7.9Zm0 1.85a3.35 3.35 0 1 1 0 6.7 3.35 3.35 0 0 1 0-6.7Z" />
                    </svg>
                  )}
                </button>
              </div>

              <button className="auth-button" type="submit" disabled={!canSubmit}>
                {submitting ? 'A entrar...' : 'Entrar'}
              </button>
            </form>

            <p className="auth-footer-link">
              <Link to="/forgot-password">Recuperar palavra-passe</Link>
            </p>
          </div>
      </section>
    </main>
  )
}
