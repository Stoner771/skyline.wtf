import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Plus, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

export default function Licenses() {
  const [licenses, setLicenses] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    app_id: '',
    duration_days: 30,
    is_lifetime: false,
    count: 1
  })
  const [copiedKey, setCopiedKey] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [licensesRes, appsRes] = await Promise.all([
        api.get('/admin/licenses/'),
        api.get('/admin/apps/')
      ])
      setLicenses(licensesRes.data || [])
      setApps(appsRes.data || [])
      setError('')
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setError(error.response?.data?.detail || 'Failed to fetch licenses')
      setLicenses([])
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      if (!formData.app_id) {
        setError('Please select an application')
        setCreating(false)
        return
      }
      const response = await api.post('/admin/licenses/', formData)
      setShowModal(false)
      setFormData({ app_id: '', duration_days: 30, is_lifetime: false, count: 1 })
      await fetchData()
      alert(`Successfully generated ${response.data?.length || formData.count} license(s)`)
    } catch (error) {
      console.error('Failed to create licenses:', error)
      setError(error.response?.data?.detail || 'Failed to create licenses')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this license?')) return
    try {
      await api.delete(`/admin/licenses/${id}`)
      fetchData()
    } catch (error) {
      console.error('Failed to delete license:', error)
    }
  }

  const handleResetHWID = async (id) => {
    if (!confirm('Reset HWID binding for this license?')) return
    try {
      await api.post('/admin/licenses/reset-hwid', { license_id: id })
      fetchData()
    } catch (error) {
      console.error('Failed to reset HWID:', error)
    }
  }

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
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
          <h1 className="text-3xl font-bold mb-2">Licenses</h1>
          <p className="text-muted-foreground">Manage license keys</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Licenses
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <Card>
        {licenses.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No licenses found. Generate your first license to get started.</p>
          </div>
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>License Key</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>HWID</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.map((license) => {
              const app = apps.find(a => a.id === license.app_id)
              const isExpired = license.expires_at && new Date(license.expires_at) < new Date()
              return (
                <TableRow key={license.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {license.license_key}
                      </code>
                      <button
                        onClick={() => copyKey(license.license_key)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {copiedKey === license.license_key ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>{app?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {license.hwid ? (
                      <code className="text-xs">{license.hwid.substring(0, 16)}...</code>
                    ) : (
                      <span className="text-muted-foreground">Not bound</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {license.expiry_timestamp
                      ? format(new Date(license.expiry_timestamp), 'MMM dd, yyyy')
                      : 'Lifetime'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        !license.is_active
                          ? 'destructive'
                          : isExpired
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {!license.is_active
                        ? 'Inactive'
                        : isExpired
                        ? 'Expired'
                        : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {license.hwid && (
                        <button
                          onClick={() => handleResetHWID(license.id)}
                          className="p-2 hover:bg-accent rounded"
                          title="Reset HWID"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(license.id)}
                        className="p-2 hover:bg-destructive/10 rounded text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        )}
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
              <h2 className="text-2xl font-bold mb-4">Generate Licenses</h2>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Application</label>
                  <select
                    value={formData.app_id}
                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select application</option>
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_lifetime}
                      onChange={(e) =>
                        setFormData({ ...formData, is_lifetime: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span>Lifetime license</span>
                  </label>
                </div>
                {!formData.is_lifetime && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (days)</label>
                    <Input
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) =>
                        setFormData({ ...formData, duration_days: parseInt(e.target.value) })
                      }
                      min="1"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Count</label>
                  <Input
                    type="number"
                    value={formData.count}
                    onChange={(e) =>
                      setFormData({ ...formData, count: parseInt(e.target.value) })
                    }
                    min="1"
                    max="100"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={creating}>
                    {creating ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setError('')
                      setFormData({ app_id: '', duration_days: 30, is_lifetime: false, count: 1 })
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

