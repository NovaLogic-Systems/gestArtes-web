/**
 * @file src/App.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useState, useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Toast from './components/ui/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import ValidationsPage from './pages/admin/ValidationsPage'
import { useAuth } from './hooks/useAuth'
import { getDashboardPath, toAppRole } from './utils/roles'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import StudioManagementPage from './pages/admin/StudioManagementPage'
import StudioOccupancyPage from './pages/admin/StudioOccupancyPage'
import FinancialDashboardPage from './pages/admin/FinancialDashboardPage'
import AuditPage from './pages/admin/AuditPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import MarketplaceModerationPage from './pages/admin/MarketplaceModerationPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminNotificationsPage from './pages/admin/NotificationsPage'
import AdminTimetablesPage from './pages/admin/AdminTimetablesPage'
import DashboardPage from './pages/student/DashboardPage'
import StudentTimetablePage from './pages/student/TimetablePage'
import CoachingStudentPage from './pages/student/CoachingPage'
import AdmissionRequestsPage from './pages/teacher/AdmissionRequestsPage'
import SessionConfirmationPage from './pages/teacher/SessionConfirmationPage'
import TeacherInventoryPage from './pages/teacher/InventoryPage'
import InventoryPage from './pages/student/InventoryPage'
import LostFoundPage from './pages/student/LostFoundPage'
import RentalCheckoutPage from './pages/student/RentalCheckoutPage'
import RentalRequestsPage from './pages/student/RentalRequestsPage'
import TeacherDashboardPage from './pages/teacher/DashboardPage'
import TeacherTimetablePage from './pages/teacher/TimetablePage'
import MarketplacePage from './pages/student/MarketplacePage'
import AccountPage from './pages/student/AccountPage'
import MyListingsPage from './pages/student/MyListingsPage'
import TeacherMarketplacePage from './pages/teacher/MarketplacePage'
import TeacherMarketplaceListingsPage from './pages/teacher/MyListingsPage'
import NotificationsPage from './pages/teacher/NotificationsPage';
import StudentNotificationsPage from './pages/student/NotificationsPage';
import LostFoundAdminPage from './pages/admin/LostFoundAdminPage'
import CreateCoachingPage from './pages/teacher/CreateCoachingPage'
import TeacherAccountPage from './pages/teacher/AccountPage'
import TeacherCoachingPage from './pages/teacher/TeacherCoachingPage'
import MyHistoryPage from './pages/student/MyHistoryPage'

function PlaceholderPage({ title }) {
  return (
    <section style={{ padding: '1rem 0' }}>
      <p style={{ color: '#555', margin: 0 }}>
        Página em construção: {title}.
      </p>
    </section>
  )
}

function UnauthorizedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loading, role, user } = useAuth()
  const currentRole = toAppRole(role || user?.role)
  const dashboardPath = getDashboardPath(currentRole)
  const requestedPath = typeof location.state?.from === 'string' ? location.state.from : ''
  const allowedRoles = Array.isArray(location.state?.allowedRoles) ? location.state.allowedRoles.filter(Boolean) : []
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'a tua conta'

  return (
    <main className="auth-shell">
      <div aria-hidden="true" className="auth-orb auth-orb-a" />
      <div aria-hidden="true" className="auth-orb auth-orb-b" />

      <section className="auth-card auth-card-recovery" aria-labelledby="unauthorized-title">
        <div className="auth-login-brand">
          <h1 id="unauthorized-title" className="auth-title-sm">
            Acesso não autorizado
          </h1>
          <p className="auth-copy">A tua sessão continua ativa, mas esta área não está disponível para o teu perfil.</p>
        </div>

        <div className="auth-login-form" style={{ alignItems: 'stretch', textAlign: 'left', width: '100%' }}>
          <p className="auth-status auth-status-info" role="status" aria-live="polite" style={{ width: '100%' }}>
            {loading
              ? 'A confirmar a tua sessão...'
              : requestedPath
                ? `${displayName} (${String(currentRole || 'sem role').toUpperCase()}) não tem acesso a ${requestedPath}.`
                : `${displayName} (${String(currentRole || 'sem role').toUpperCase()}) não tem acesso a esta página.`}
          </p>

          {allowedRoles.length ? (
            <p className="auth-copy" style={{ maxWidth: 'none', textAlign: 'left' }}>
              Funções permitidas: {allowedRoles.join(', ')}.
            </p>
          ) : null}

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {currentRole ? (
              <button
                type="button"
                className="auth-button"
                onClick={() => navigate(dashboardPath, { replace: true })}
              >
                Ir para o meu painel
              </button>
            ) : (
              <Link
                className="auth-button"
                to="/login"
                style={{ alignItems: 'center', display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}
              >
                Ir para login
              </Link>
            )}

            <Link className="auth-footer-link" to="/login" style={{ textAlign: 'center' }}>
              Voltar para login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProtectedPlaceholderPage({ title, actionLink }) {
  const navigate = useNavigate()
  const { logout, role, user } = useAuth()
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Utilizador'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem' }}>
      <header
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <p style={{ color: '#666', margin: 0 }}>
            {displayName} · {String(role || '').toUpperCase()}
          </p>
          <h1 style={{ margin: 0 }}>{title}</h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '999px',
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 600,
            padding: '0.55rem 0.95rem',
          }}
        >
          Terminar sessão
        </button>
      </header>

      {actionLink ? (
        <div style={{ marginBottom: '1rem' }}>
          <Link
            to={actionLink.to}
            style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '999px',
              color: '#08060d',
              display: 'inline-flex',
              fontWeight: 600,
              padding: '0.55rem 0.95rem',
              textDecoration: 'none',
            }}
          >
            {actionLink.label}
          </Link>
        </div>
      ) : null}

      <PlaceholderPage title={title} />
    </main>
  )
}

const StudentSectionPage = ({ title }) => <PlaceholderPage title={title} />
const CoachingPage = () => <CoachingStudentPage />
const AdminDashboard = () => <AdminDashboardPage />

function App() {
  const [globalToasts, setGlobalToasts] = useState([])
  const location = useLocation()

  useEffect(() => {
    const addToast = (text, type = 'danger') => {
      if (!text || !text.trim()) return
      const cleanText = text.trim()

      const id = Date.now() + Math.random()

      setGlobalToasts((prev) => {
        const isDuplicate = prev.some((t) => t.description === cleanText && Date.now() - t.id < 2000)
        if (isDuplicate) return prev

        setTimeout(() => {
          setGlobalToasts((current) => current.filter((t) => t.id !== id))
        }, 5000)

        return [
          ...prev,
          {
            id,
            variant: type,
            title: type === 'success' ? 'Sucesso' : 'Erro',
            description: cleanText,
          },
        ]
      })
    }

    const selectors = [
      '.error-banner',
      '.inventory-error-banner',
      '.soft-box.error',
      '.auth-status-error',
      '.submission-error',
      '.bk-error',
      '.account-success-banner',
      '.inventory-success-banner',
      '.modal-error',
      '.account-error-message',
      '.account-success-message',
    ]

    const checkElement = (el) => {
      if (!el || !el.matches) return

      const matchedSelector = selectors.find((sel) => el.matches(sel))
      if (matchedSelector) {
        const text = el.textContent || ''
        const isSuccess = matchedSelector.includes('success') || matchedSelector.includes('message')
        addToast(text, isSuccess ? 'success' : 'danger')
      }
    }

    // Scan existing elements
    document.querySelectorAll(selectors.join(',')).forEach(checkElement)

    // Observe changes in body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkElement(node)
            selectors.forEach((sel) => {
              node.querySelectorAll(sel).forEach(checkElement)
            })
          }
        })

        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          const parent = mutation.target.parentElement
          if (parent) {
            selectors.forEach((sel) => {
              const closest = parent.closest(sel)
              if (closest) {
                checkElement(closest)
              }
            })
          }
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [location.pathname])

  const handleCloseToast = (id) => {
    setGlobalToasts((current) => current.filter((t) => t.id !== id))
  }

  return (
    <>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/student/dashboard" element={<DashboardPage />} />
        <Route path="/student/coaching" element={<CoachingPage />} />
        <Route path="/student/timetable" element={<StudentTimetablePage />} />
        <Route path="/student/inventory" element={<InventoryPage />} />
        <Route path="/student/inventory/checkout/:itemId" element={<RentalCheckoutPage />} />
        <Route path="/student/inventory/rentals" element={<RentalRequestsPage />} />
        <Route path="/student/marketplace" element={<MarketplacePage />} />
        <Route path="/student/marketplace/conversas" element={<Navigate to="/student/marketplace" replace />} />
        <Route path="/student/marketplace/my-listings" element={<MyListingsPage />} />
        <Route path="/student/lostfound" element={<LostFoundPage />} />
        <Route path="/student/account" element={<AccountPage />} />
        <Route path="/student/history" element={<MyHistoryPage />} />
        <Route path="/student/notifications" element={<StudentNotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/teacher/timetable" element={<TeacherTimetablePage />} />
        <Route path="/teacher/admission-requests" element={<AdmissionRequestsPage />} />
        <Route path="/teacher/sessions/confirmation" element={<SessionConfirmationPage />} />
        <Route path="/teacher/schedule" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/teacher/availability" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/teacher/coaching" element={<TeacherCoachingPage />} />
        <Route path="/teacher/inventory" element={<TeacherInventoryPage />} />
        <Route path="/teacher/marketplace" element={<TeacherMarketplacePage />} />
        <Route path="/teacher/marketplace/conversas" element={<Navigate to="/teacher/marketplace" replace />} />
        <Route path="/teacher/marketplace/my-listings" element={<TeacherMarketplaceListingsPage />} />
        <Route path="/teacher/notifications" element={<NotificationsPage />} />
        <Route path="/teacher/account" element={<TeacherAccountPage />} />
        <Route path="/teacher/coaching/create" element={<CreateCoachingPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/validations" element={<ValidationsPage />} />
        <Route path="/admin/studios" element={<StudioManagementPage />} />
        <Route path="/admin/studio-occupancy" element={<StudioOccupancyPage />} />
        <Route path="/admin/inventory" element={<AdminInventoryPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/marketplace/conversas" element={<Navigate to="/admin/marketplace" replace />} />
        <Route path="/admin/marketplace" element={<MarketplaceModerationPage />} />
        <Route path="/admin/finance" element={<FinancialDashboardPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
        <Route path="/admin/lost-and-found" element={<LostFoundAdminPage />} />
        <Route path="/admin/lostfound" element={<Navigate to="/admin/lost-and-found" replace />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/timetables" element={<AdminTimetablesPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    {globalToasts.map((t) => (
      <Toast
        key={t.id}
        variant={t.variant}
        title={t.title}
        description={t.description}
        onClose={() => handleCloseToast(t.id)}
      />
    ))}
    </>
  )
}

export default App
