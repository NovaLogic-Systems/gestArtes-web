import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function getDashboardPath(currentRole) {
  if (currentRole === 'admin') {
    return '/admin/dashboard'
  }

  if (currentRole === 'teacher') {
    return '/teacher/dashboard'
  }

  return '/student/dashboard'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, role, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => !submitting && email.trim().length > 0 && password.length > 0,
    [email, password, submitting],
  )

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(getDashboardPath(role), { replace: true })
    }
  }, [isAuthenticated, loading, navigate, role])

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
      navigate(getDashboardPath(nextRole), { replace: true })
    } catch (requestError) {
      const message = requestError?.response?.data?.error || 'Credenciais inválidas'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '1.5rem' }}>
      <section style={{ width: '100%', maxWidth: 420, border: '1px solid #ddd', borderRadius: 12, padding: '1.5rem', background: '#fff' }}>
        <h1 style={{ marginTop: 0 }}>Entrar</h1>
        <p style={{ marginTop: 0, color: '#555' }}>Autentica-te para aceder ao gestArtes.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />

          {error ? <p style={{ margin: 0, color: '#b00020' }}>{error}</p> : null}

          <button type="submit" disabled={!canSubmit}>
            {submitting ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <p style={{ marginBottom: 0, marginTop: '1rem' }}>
          <Link to="/forgot-password">Recuperar password</Link>
        </p>
      </section>
    </main>
  )
}
