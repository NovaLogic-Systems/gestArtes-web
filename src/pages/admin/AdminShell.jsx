import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ADMIN_NAV_ITEMS } from './adminNav'
import '../admin-studios.css'

function AdminShell({ title, subtitle, activePath, children, topbarEnd }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const displayName = user?.fullName || user?.name || user?.email || 'Utilizador'

  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClass = ['app-shell', sidebarHidden ? 'sidebar-hidden' : ''].filter(Boolean).join(' ')
  const sidebarClass = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const toggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : (sidebarCollapsed ? '▶' : '◀')
  const toggleLabel = isMobile
    ? (mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral')
    : (sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral')

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const update = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setMobileOpen(false)
    }
    update()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }

    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handleSidebarToggle() {
    if (isMobile) setMobileOpen((v) => !v)
    else setSidebarCollapsed((v) => !v)
  }

  function handleMobileNavClick() {
    if (isMobile) setMobileOpen(false)
  }

  const isNavItemActive = (href) => {
    if (!activePath) return false

    if (href === '/admin/studios') {
      return activePath === '/admin/studios' || activePath === '/admin/studio-occupancy'
    }

    if (href === '/admin') {
      return activePath === '/admin'
    }

    return activePath.startsWith(href)
  }

  return (
    <div className={appShellClass}>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar navegação lateral"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={sidebarClass} id="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>gestArtes</h1>
            <p>{displayName}</p>
          </div>
        </div>

        <div className="nav-group">
          <h2>Gestão</h2>
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${isNavItemActive(item.href) ? ' active' : ''}`}
              to={item.href}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="nav-link"
            title={`Terminar sessão de ${displayName}`}
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
              width: '100%',
            }}
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-heading">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={toggleLabel}
                onClick={handleSidebarToggle}
              >
                {toggleSymbol}
              </button>
              <h2>{title}</h2>
            </div>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {topbarEnd ? <div className="topbar-right">{topbarEnd}</div> : null}
        </header>

        <div className="content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminShell
