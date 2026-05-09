/**
 * @file src/pages/admin/AdminMarketplaceConversationsPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getMarketplaceListingById, listMarketplaceListings } from '../../services/marketplace'
import { maskEmail, maskPhone } from '../../utils/masking'
import '../admin-studios.css'
import '../student/marketplace.css'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Utilizadores', href: '/admin/users' },
  { label: 'Estúdios', href: '/admin/studios' },
  { label: 'Marketplace', href: '/admin/marketplace' },
    { label: 'Conversas', href: '/admin/marketplace/conversas' },
  { label: 'Moderação', href: '/admin/moderation' },
  { label: 'Minha Conta', href: '/admin/account' },
]

function normalizePhone(phoneNumber) {
  return String(phoneNumber || '').replace(/\D/g, '')
}

export default function AdminMarketplaceConversationsPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [mobileOpen, setMobileOpen] = useState(false)

  const adminName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrador'
  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarToggleSymbol = isMobile ? (mobileOpen ? '✕' : '☰') : '☰'
  const sidebarToggleLabel = mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value)
    }
  }, [isMobile])

  const handleMobileNavClick = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [isMobile])

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const baseListings = await listMarketplaceListings()
      const detailResults = await Promise.allSettled(
        baseListings.map(async (listing) => {
          const detail = await getMarketplaceListingById(listing.listingId)
          return detail || listing
        }),
      )

      const withContact = detailResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((listing) => {
          const seller = listing?.seller
          return Boolean(seller?.email || seller?.phoneNumber)
        })

      setListings(withContact)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível carregar as conversas do marketplace.')
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)

      if (!mobile) {
        setMobileOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    onResize()

    return () => window.removeEventListener('resize', onResize)
  }, [])

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return listings
    }

    return listings.filter((listing) => {
      const seller = listing?.seller || {}
      const searchable = [
        listing?.title,
        seller?.firstName,
        seller?.lastName,
        seller?.email,
        listing?.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(term)
    })
  }, [listings, search])

  return (
    <div className="admin-dashboard market-page">
      <div className="app-shell">
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
              <p>{adminName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Administração</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href} onClick={handleMobileNavClick}>
                  {item.label}
                </Link>
              )
            })}

            <button
              className="nav-link"
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login?reason=logged-out', { replace: true })
              }}
            >
              Terminar Sessão
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarToggleLabel}
                aria-controls="sidebar"
                aria-expanded={mobileOpen}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <div>
                <h2>Conversas do Marketplace</h2>
                <p>Visualize e modere todos os contactos e conversas do marketplace.</p>
              </div>
            </div>
            <div className="topbar-right">
              <Link className="pill" to="/admin/marketplace">
                Voltar ao marketplace
              </Link>
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <h3>Conversas entre utilizadores</h3>

              <div className="market-field-row market-conversations-search">
                <input
                  className="search"
                  placeholder="Pesquisar por anúncio, vendedor, localização ou email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar conversas...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Não existem conversas disponíveis no marketplace.</p>
              ) : (
                <div className="market-conversations-grid">
                  {filteredListings.map((listing) => {
                    const seller = listing?.seller || {}
                    const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'Vendedor'
                    const mailHref = seller.email ? `mailto:${seller.email}` : null
                    const whatsappDigits = normalizePhone(seller.phoneNumber)
                    const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null

                    return (
                      <article className="market-conversation-card" key={listing.listingId}>
                        <h4>{listing.title || 'Anúncio sem título'}</h4>
                        <p className="market-listing-meta">{listing.location || 'Localização não definida'}</p>
                        <p>
                          <strong>Vendedor:</strong> {sellerName}
                        </p>
                        <p>
                          <strong>Email:</strong> {maskEmail(seller.email) || 'Sem email público'}
                        </p>
                        <p>
                          <strong>Telefone:</strong> {maskPhone(seller.phoneNumber) || 'Sem telefone público'}
                        </p>

                        <div className="market-listing-actions">
                          {mailHref ? (
                            <a className="market-btn market-link-btn" href={mailHref}>
                              Contactar
                            </a>
                          ) : null}
                          {whatsappHref ? (
                            <a className="market-btn market-link-btn" href={whatsappHref} target="_blank" rel="noreferrer">
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
