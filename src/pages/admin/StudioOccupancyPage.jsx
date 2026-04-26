import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import StudioOccupancyPanel from '../../components/admin/StudioOccupancyPanel'
import notificationPreviewService from '../../services/notificationPreviewService'
import '../admin-studios.css'

const navigationItems = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/validations', label: 'Validações' },
  { href: '/admin/studios', label: 'Estúdios' },
  { href: '/admin/users', label: 'Utilizadores' },
  { href: '/admin/lostfound', label: 'Perdidos e Achados' },
  { href: '/admin/inventory', label: 'Inventário da Escola' },
  { href: '/admin/marketplace', label: 'Marketplace' },
  { href: '/admin/finance', label: 'Finanças' },
  { href: '/admin/audit', label: 'Auditoria' },
]

function StudioOccupancyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  const displayName = user?.fullName || user?.name || user?.email || 'Utilizador'

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

  const initialStudioId = useMemo(() => {
    const queryParams = new URLSearchParams(location.search)
    return queryParams.get('studioId') || ''
  }, [location.search])

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

  useEffect(() => {
    void (async () => {
      try {
        const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
        setNotificationUnreadCount(preview.unreadCount)
      } catch {
        // ignore
      }
    })()
  }, [])

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

  const handleLogout = async (event) => {
    event.preventDefault()
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }

  const isNavItemActive = (href) => {
    if (href === '/admin/studios') {
      return location.pathname === '/admin/studios' || location.pathname === '/admin/studio-occupancy'
    }

    if (href === '/admin') {
      return location.pathname === '/admin'
    }

    return location.pathname.startsWith(href)
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
              className={`nav-link ${isNavItemActive(item.href) ? 'active' : ''}`}
              to={item.href}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}

          <a className="nav-link" href="/login" title="Terminar sessão" onClick={handleLogout}>
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
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <h2>Gestão Detalhada de Ocupação</h2>
            </div>
            <p>Visualização e previsão de ocupação dos estúdios</p>
          </div>

          <div className="topbar-right">
            <button type="button" className="pill notifications-pill">
              Notificações {notificationUnreadCount}
            </button>
          </div>
        </header>

        <section className="content-grid">
          <div className="quick-actions occupancy-actions">
            <Link className="ghost-btn" to="/admin/studios">
              &larr; Voltar para Estúdios
            </Link>
          </div>
          <StudioOccupancyPanel initialStudioId={initialStudioId} />
        </section>
      </main>
    </div>
  )
}

export default StudioOccupancyPage
