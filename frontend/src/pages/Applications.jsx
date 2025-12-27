import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Plus, Trash2, Edit, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Applications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    version: '1.0.0',
    webhook_url: ''
  })
  const [copiedSecret, setCopiedSecret] = useState(null)

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      const response = await api.get('/admin/apps/')
      setApps(response.data)
    } catch (error) {
      console.error('Failed to fetch apps:', error)
      // Set empty array on error, don't redirect
      setApps([])
      // Only redirect if it's a 401 and we're sure token is invalid
      if (error.response?.status === 401) {
        const token = localStorage.getItem('token')
        if (!token) {
          window.location.href = '/login'
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token')
      console.log('Creating app with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
      
      const response = await api.post('/admin/apps/', formData)
      setShowModal(false)
      setFormData({ name: '', version: '1.0.0', webhook_url: '' })
      setError('')
      await fetchApps()
    } catch (error) {
      console.error('Failed to create app:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Request headers:', error.config?.headers)
      
      let errorMessage = 'Failed to create application'
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => {
            if (typeof err === 'string') return err
            if (err.msg) return err.msg
            return JSON.stringify(err)
          }).join(', ')
        } else {
          errorMessage = JSON.stringify(error.response.data.detail)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this application?')) return
    try {
      await api.delete(`/admin/apps/${id}`)
      fetchApps()
    } catch (error) {
      console.error('Failed to delete app:', error)
    }
  }

  const copySecret = (secret) => {
    navigator.clipboard.writeText(secret)
    setCopiedSecret(secret)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Applications</h1>
          <p className="text-muted-foreground">Manage your applications</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Secret</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Force Update</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {app.secret.substring(0, 16)}...
                    </code>
                    <button
                      onClick={() => copySecret(app.secret)}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {copiedSecret === app.secret ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </TableCell>
                <TableCell>{app.version}</TableCell>
                <TableCell>
                  <Badge variant={app.force_update ? 'warning' : 'success'}>
                    {app.force_update ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(app.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-2 hover:bg-destructive/10 rounded text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold mb-4">Create Application</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Version</label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Webhook URL (Optional)</label>
                  <Input
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    type="url"
                    disabled={creating}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setError('')
                      setFormData({ name: '', version: '1.0.0', webhook_url: '' })
                    }}
                    className="flex-1"
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

