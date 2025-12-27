import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('token') : null
    } catch (error) {
      console.warn('Could not access localStorage:', error)
      return null
    }
  })
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAdminInfo = async () => {
    try {
      const response = await api.get('/admin/stats')
      setAdmin({ username: 'Admin' })
      setLoading(false)
      return true
    } catch (error) {
      console.warn('Failed to fetch admin info:', error.response?.status, error.message)
      // Only clear token and redirect on 401 (unauthorized)
      if (error.response?.status === 401) {
        console.log('Token invalid (401), logging out...')
        setToken(null)
        setAdmin(null)
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        setLoading(false)
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return false
      } else {
        // For other errors (network, 500, 404, etc), just set admin and continue
        // Don't log out on temporary errors - stats endpoint might fail for other reasons
        console.log('Non-401 error, continuing with admin access')
        setAdmin({ username: 'Admin' })
        setLoading(false)
        return true
      }
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
          console.log('Initializing auth with token')
          setToken(storedToken)
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
          // Set admin immediately so navigation works - don't wait for stats
          setAdmin({ username: 'Admin' })
          setLoading(false)
          
          // Fetch stats in background (non-blocking, don't let it affect auth state)
          fetchAdminInfo().catch(err => {
            console.warn('Background admin info fetch failed (non-critical):', err)
            // Don't redirect or clear token on background fetch failure
            // This is just for stats display, not for authentication
          })
        } else {
          console.log('No token found, user not logged in')
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
      }
    }
    initAuth()
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/admin/login', {
        username,
        password
      })
      const { token: newToken } = response.data
      setToken(newToken)
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      // Set admin immediately, don't wait for stats
      setAdmin({ username: 'Admin' })
      setLoading(false)
      
      // Redirect to dashboard
      window.location.href = '/'
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Login failed'
      
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => {
            if (typeof err === 'string') return err
            if (err.msg) return err.msg
            return JSON.stringify(err)
          }).join(', ')
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = errorData.detail.msg || errorData.detail.message || JSON.stringify(errorData.detail)
        } else {
          errorMessage = JSON.stringify(errorData.detail)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  const logout = () => {
    setToken(null)
    setAdmin(null)
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ token, admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

