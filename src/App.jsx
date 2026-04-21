import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import StudioManagementPage from './pages/admin/StudioManagementPage'

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
  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '2rem' }}>
      <section style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Acesso negado</h1>
        <p style={{ color: '#555', marginTop: 0 }}>Não tens permissão para aceder a esta página.</p>
        <Link to="/login">Voltar para login</Link>
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
    navigate('/login?reason=logged-out', { replace: true })
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

const StudentDashboard = () => <ProtectedPlaceholderPage title="Student Dashboard" />
const CoachingPage = () => <ProtectedPlaceholderPage title="Coaching" />
const TeacherDashboard = () => <ProtectedPlaceholderPage title="Teacher Dashboard" />
const AdminDashboard = () => (
  <ProtectedPlaceholderPage
    title="Admin Dashboard"
    actionLink={{ to: '/admin/studios', label: 'Gestão de estúdios' }}
  />
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/coaching" element={<CoachingPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/studios" element={<StudioManagementPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
