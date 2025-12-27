import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Licenses from './pages/Licenses'
import Users from './pages/Users'
import Resellers from './pages/Resellers'
import Tickets from './pages/Tickets'
import Logs from './pages/Logs'
import Files from './pages/Files'
import Settings from './pages/Settings'
import ResellerDashboard from './pages/reseller/ResellerDashboard'
import ResellerTickets from './pages/reseller/ResellerTickets'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // If no token after loading, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  // If we have a token, show the content
  // Don't re-check on every navigation - trust the token
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Unified Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/reseller/login" element={<Navigate to="/login" replace />} />
      
      {/* Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="apps" element={<Applications />} />
        <Route path="licenses" element={<Licenses />} />
        <Route path="users" element={<Users />} />
        <Route path="resellers" element={<Resellers />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="logs" element={<Logs />} />
        <Route path="files" element={<Files />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Reseller Routes */}
      <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
      <Route path="/reseller/tickets" element={<ResellerTickets />} />
    </Routes>
  )
}

function App() {
  console.log('🎯 App component rendering...')
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

