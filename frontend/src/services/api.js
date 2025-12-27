import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Function to update auth header from localStorage
const updateAuthHeader = () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('Auth header updated with token')
    } else {
      delete api.defaults.headers.common['Authorization']
      console.warn('No token found in localStorage')
    }
  } catch (error) {
    console.warn('Could not access localStorage:', error)
  }
}

// Update auth header on initialization
updateAuthHeader()

// Update auth header before each request to ensure it's always current
api.interceptors.request.use(
  (config) => {
    // Check for both admin and reseller tokens
    const adminToken = localStorage.getItem('token')
    const resellerToken = localStorage.getItem('reseller_token')
    
    // Prioritize reseller token for reseller endpoints
    if (config.url?.includes('/reseller/')) {
      if (resellerToken) {
        config.headers.Authorization = `Bearer ${resellerToken}`
        console.log('Request interceptor: Added Reseller Authorization header', config.url)
      } else {
        console.warn('Request interceptor: No reseller token found for', config.url)
        delete config.headers.Authorization
      }
    } else {
      // Use admin token for admin endpoints
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
        console.log('Request interceptor: Added Admin Authorization header', config.url)
      } else {
        console.warn('Request interceptor: No admin token found for', config.url)
        delete config.headers.Authorization
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      const requestUrl = error.config?.url || ''
      
      // Don't redirect if already on login page
      if (currentPath.includes('/login')) {
        return Promise.reject(error)
      }
      
      // Don't redirect if it's the login request itself
      if (requestUrl.includes('/auth/admin/login') || requestUrl.includes('/auth/reseller/login')) {
        return Promise.reject(error)
      }
      
      // Check which token is present
      const adminToken = localStorage.getItem('token')
      const resellerToken = localStorage.getItem('reseller_token')
      
      console.warn('401 error:', requestUrl, 'Admin Token:', !!adminToken, 'Reseller Token:', !!resellerToken)
      
      // Don't auto-redirect - let pages handle errors
      // Pages will show error messages instead of redirecting
    }
    return Promise.reject(error)
  }
)

export default api

