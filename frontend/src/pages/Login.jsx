import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Key } from 'lucide-react'
import api from '../services/api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Try admin login first
      try {
        const adminResponse = await api.post('/auth/admin/login', {
          username,
          password
        })
        
        const { token } = adminResponse.data
        localStorage.setItem('token', token)
        localStorage.removeItem('reseller_token') // Clear reseller token if exists
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        // Force reload to ensure AuthContext picks up the token
        window.location.href = '/'
        return
      } catch (adminError) {
        // If admin login fails with 401, try reseller login
        if (adminError.response?.status === 401) {
          try {
            const resellerResponse = await api.post('/auth/reseller/login', {
              username,
              password
            })
            
            const { token } = resellerResponse.data
            localStorage.setItem('reseller_token', token)
            localStorage.removeItem('token') // Clear admin token if exists
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
            
            // Force reload to ensure proper authentication
            window.location.href = '/reseller/dashboard'
            return
          } catch (resellerError) {
            // Both failed
            throw new Error('Invalid credentials')
          }
        } else {
          // Other error, throw it
          throw adminError
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Invalid credentials. Please check your username and password.'
      
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail)
      } else if (error.message && !error.message.includes('Invalid credentials')) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Key className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">SkyLine</h1>
            <p className="text-muted-foreground">Login Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
              >
                {typeof error === 'string' ? error : String(error)}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

