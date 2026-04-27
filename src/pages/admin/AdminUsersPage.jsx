import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import WithRole from '../../components/WithRole'
import { useAuth } from '../../hooks/useAuth'
import adminUsersService from '../../services/adminUsersService'
import { maskEmail } from '../../utils/masking'
import { ADMIN_ROLE_OPTIONS, toAppRole } from '../../utils/roles'
import '../admin-studios.css'

const navigationItems = [
  { href: '/admin/dashboard', label: 'Painel' },
  { href: '/admin/validations', label: 'Validações' },
  { href: '/admin/studios', label: 'Estúdios' },
  { href: '/admin/users', label: 'Utilizadores' },
  { href: '/admin/lostfound', label: 'Perdidos e Achados' },
  { href: '/admin/inventory', label: 'Inventário da Escola' },
  { href: '/admin/marketplace', label: 'Marketplace' },
  { href: '/admin/finance', label: 'Finanças' },
  { href: '/admin/audit', label: 'Auditoria' },
]

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'student',
  birthDate: '',
  guardianName: '',
  guardianPhone: '',
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || maskEmail(user?.email) || 'Utilizador'
  const sidebarActivePath = location.pathname
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : '']
    .filter(Boolean)
    .join(' ')
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : '']
    .filter(Boolean)
    .join(' ')
  const sidebarToggleSymbol = isMobile
    ? mobileOpen ? '✕' : '☰'
    : sidebarCollapsed ? '▶' : '◀'
  const sidebarToggleLabel = isMobile
    ? mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'
    : sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral'

  const selectedRole = useMemo(() => toAppRole(form.role), [form.role])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const entries = await adminUsersService.listUsers()
      setUsers(entries)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível carregar os utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')

    const updateLayout = () => {
      setIsMobile(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setMobileOpen(false)
      }
    }

    updateLayout()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateLayout)
      return () => mediaQuery.removeEventListener('change', updateLayout)
    }

    mediaQuery.addListener(updateLayout)
    return () => mediaQuery.removeListener(updateLayout)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')

    return () => {
      document.body.classList.remove('studio-page')
    }
  }, [])

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        role: form.role,
        birthDate: form.birthDate || undefined,
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
      }

      const createdUser = await adminUsersService.createUser(payload)
      setNotice(`Utilizador ${maskEmail(createdUser.email)} criado com sucesso.`)
      setForm(emptyForm)
      await loadUsers()
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível criar o utilizador.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout(event) {
    event.preventDefault()

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileOpen((currentValue) => !currentValue)
      return
    }

    setSidebarCollapsed((currentValue) => !currentValue)
  }

  const handleMobileNavClick = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  return (
    <div className={appShellClassName}>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar navegação lateral"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={sidebarClassName} id="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>gestArtes</h1>
            <p>{displayName}</p>
          </div>
        </div>

        <div className="nav-group">
          <h2>Gestão</h2>

          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${sidebarActivePath === item.href ? ' active' : ''}`}
              to={item.href}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}

          <a className="nav-link" href="/login" title={`Terminar sessão de ${displayName}`} onClick={handleLogout}>
            Terminar Sessão
          </a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-heading">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarToggleLabel}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <h2>Gestão de Utilizadores</h2>
            </div>
            <p>Criação de contas com seleção de role e mapeamento explícito de Direção para Admin.</p>
          </div>

          <div className="topbar-right">
            <span className="pill">Admin</span>
          </div>
        </header>

        <section className="content-grid">
          {notice ? (
            <div className="soft-box" role="status" aria-live="polite">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="soft-box error" role="alert">
              {error}
            </div>
          ) : null}

          <article className="panel">
            <div className="panel-header">
              <h3>Utilizadores registados</h3>
              <button type="button" className="ghost-btn" onClick={() => void loadUsers()}>
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="soft-box">A carregar utilizadores...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Estado</th>
                      <th>Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length ? (
                      users.map((entry) => (
                        <tr key={entry.userId}>
                          <td>{[entry.firstName, entry.lastName].filter(Boolean).join(' ') || '—'}</td>
                          <td>{maskEmail(entry.email) || '—'}</td>
                          <td>{entry.roleLabel || entry.role || '—'}</td>
                          <td>{entry.isActive ? 'Ativo' : 'Inativo'}</td>
                          <td>{formatDate(entry.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>Sem utilizadores disponíveis.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <WithRole roles={['admin']}>
            <article className="panel">
              <div className="panel-header">
                <h3>Novo utilizador</h3>
              </div>

              <p>
                A opção <strong>Direção</strong> é guardada internamente como role de sistema <strong>admin</strong>.
              </p>

              <form className="form-grid two" onSubmit={handleSubmit}>
                <label>
                  Nome
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) => updateForm('firstName', event.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label>
                  Apelido
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) => updateForm('lastName', event.target.value)}
                    autoComplete="family-name"
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Telefone
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(event) => updateForm('phoneNumber', event.target.value)}
                    autoComplete="tel"
                  />
                </label>

                <label>
                  Palavra-passe
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateForm('password', event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>

                <label>
                  Role
                  <select
                    value={form.role}
                    onChange={(event) => updateForm('role', event.target.value)}
                  >
                    {ADMIN_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRole === 'student' ? (
                  <>
                    <label>
                      Data de nascimento
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={(event) => updateForm('birthDate', event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Nome do encarregado
                      <input
                        type="text"
                        value={form.guardianName}
                        onChange={(event) => updateForm('guardianName', event.target.value)}
                      />
                    </label>

                    <label>
                      Telefone do encarregado
                      <input
                        type="text"
                        value={form.guardianPhone}
                        onChange={(event) => updateForm('guardianPhone', event.target.value)}
                      />
                    </label>
                  </>
                ) : null}

                <div className="card-actions form-actions">
                  <button className="cta" type="submit" disabled={submitting}>
                    {submitting ? 'A guardar...' : 'Criar utilizador'}
                  </button>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => {
                      setForm(emptyForm)
                      setError('')
                      setNotice('')
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </article>
          </WithRole>
        </section>
      </main>
    </div>
  )
}
