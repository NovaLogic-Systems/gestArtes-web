import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './auth.css'

const allowedReturnPrefixes = ['/student/', '/teacher/', '/admin/']

function getDashboardPath(currentRole) {
  if (currentRole === 'admin') {
    return '/admin/dashboard'
  }

  if (currentRole === 'teacher') {
    return '/teacher/dashboard'
  }

  return '/student/dashboard'
}

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loginNotice = useMemo(() => getLoginNotice(location.search), [location.search])
  const returnPath = normalizeReturnPath(location.state?.from)

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
      navigate(returnPath || getDashboardPath(role), { replace: true })
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
      navigate(returnPath || getDashboardPath(nextRole), { replace: true })
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
            <input
              className="auth-input"
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />

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
