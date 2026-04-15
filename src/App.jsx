import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'

function PlaceholderPage({ title }) {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>{title}</h1>
    </main>
  )
}

const ForgotPasswordPage = () => <PlaceholderPage title="Forgot Password" />
const UnauthorizedPage = () => <PlaceholderPage title="Unauthorized" />

const StudentDashboard = () => <PlaceholderPage title="Student Dashboard" />
const CoachingPage = () => <PlaceholderPage title="Coaching" />

const TeacherDashboard = () => <PlaceholderPage title="Teacher Dashboard" />

const AdminDashboard = () => <PlaceholderPage title="Admin Dashboard" />

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
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
