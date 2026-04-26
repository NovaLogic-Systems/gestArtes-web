import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getMarketplaceListingById, listMarketplaceListings } from '../../services/marketplace'
import '../student/DashboardPage.css'
import '../student/marketplace.css'

const NAV_ITEMS = [
  { label: 'Painel', href: '/teacher/dashboard' },
  { label: 'Disponibilidade', href: '/teacher/availability' },
  { label: 'Coaching', href: '/teacher/coaching' },
  { label: 'Marketplace', href: '/teacher/marketplace' },
  { label: 'Conversas', href: '/teacher/marketplace/conversas' },
  { label: 'Minhas ofertas', href: '/teacher/marketplace/my-listings' },
  { label: 'Minha Conta', href: '/teacher/account' },
]

function normalizePhone(phoneNumber) {
  return String(phoneNumber || '').replace(/\D/g, '')
}

export default function TeacherMarketplaceConversationsPage() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Professor'

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
          const buyer = listing?.buyer
          return Boolean(buyer?.email || buyer?.phoneNumber)
        })

      setListings(withContact)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível carregar os contactos dos alunos.')
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return listings
    }

    return listings.filter((listing) => {
      const buyer = listing?.buyer || {}
      const searchable = [
        listing?.title,
        buyer?.firstName,
        buyer?.lastName,
        buyer?.email,
        listing?.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(term)
    })
  }, [listings, search])

  return (
    <div className="teacher-dashboard market-page">
      <div className="app-shell">
        <aside className="sidebar" id="sidebar">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>gestArtes</h1>
              <p>{teacherName}</p>
            </div>
          </div>

          <div className="nav-group">
            <h2>Professor</h2>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)

              return (
                <Link key={item.href} className={`nav-link${isActive ? ' active' : ''}`} to={item.href}>
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
              <h2>Conversas</h2>
              <p>Lista de contactos dos alunos interessados nas suas ofertas do marketplace.</p>
            </div>
            <div className="topbar-right">
              <Link className="pill" to="/teacher/marketplace">
                Voltar ao marketplace
              </Link>
            </div>
          </header>

          <section className="content-grid">
            <article className="panel">
              <h3>Contactos de alunos</h3>

              <div className="market-field-row market-conversations-search">
                <input
                  className="search"
                  placeholder="Pesquisar por oferta, localização, nome ou email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
              {loading ? <p className="panel-subtle">A carregar contactos...</p> : null}

              {!loading && filteredListings.length === 0 ? (
                <p className="empty">Não existem contactos de alunos disponíveis de momento.</p>
              ) : (
                <div className="market-conversations-grid">
                  {filteredListings.map((listing) => {
                    const buyer = listing?.buyer || {}
                    const buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'Aluno'
                    const mailHref = buyer.email ? `mailto:${buyer.email}` : null
                    const whatsappDigits = normalizePhone(buyer.phoneNumber)
                    const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null

                    return (
                      <article className="market-conversation-card" key={listing.listingId}>
                        <h4>{listing.title || 'Oferta sem título'}</h4>
                        <p className="market-listing-meta">{listing.location || 'Localização não definida'}</p>
                        <p>
                          <strong>Aluno:</strong> {buyerName}
                        </p>
                        <p>
                          <strong>Email:</strong> {buyer.email || 'Sem email público'}
                        </p>
                        <p>
                          <strong>Telefone:</strong> {buyer.phoneNumber || 'Sem telefone público'}
                        </p>

                        <div className="market-listing-actions">
                          {mailHref ? (
                            <a className="market-btn market-link-btn" href={mailHref}>
                              Abrir Email
                            </a>
                          ) : null}
                          {whatsappHref ? (
                            <a className="market-btn market-link-btn" href={whatsappHref} target="_blank" rel="noreferrer">
                              Abrir WhatsApp
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
