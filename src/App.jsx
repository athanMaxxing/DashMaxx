import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    // HashRouter keeps deep links working on GitHub Pages, which has no SPA fallback.
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}
