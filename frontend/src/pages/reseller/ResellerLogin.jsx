import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Store } from 'lucide-react'
import api from '../../services/api'

export default function ResellerLogin() {
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
      const response = await api.post('/auth/reseller/login', {
        username,
        password
      })
      const { token } = response.data
      
      // Store reseller token separately
      localStorage.setItem('reseller_token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // Redirect to reseller dashboard
      navigate('/reseller/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Login failed'
      
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail)
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
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Reseller Portal</h1>
            <p className="text-muted-foreground">Login to manage licenses</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="text-center">
              <a href="/login" className="text-sm text-muted-foreground hover:text-primary">
                Admin Login →
              </a>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
