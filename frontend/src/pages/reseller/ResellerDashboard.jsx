import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { DollarSign, Package, Key, LogOut, Plus, Ticket, CreditCard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResellerDashboard() {
  const [profile, setProfile] = useState(null)
  const [apps, setApps] = useState([])
  const [licenses, setLicenses] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [licenseForm, setLicenseForm] = useState({
    app_id: '',
    duration_days: 30,
    username: '',
    hwid: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('reseller_token')
    if (!token) {
      navigate('/login')
      return
    }
    
    // API interceptor will handle setting the Authorization header
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profileRes, appsRes, licensesRes, transactionsRes] = await Promise.all([
        api.get('/reseller/profile'),
        api.get('/reseller/apps'),
        api.get('/reseller/licenses'),
        api.get('/reseller/credits/transactions')
      ])

      setProfile(profileRes.data)
      setApps(appsRes.data)
      setLicenses(licensesRes.data)
      setTransactions(transactionsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('reseller_token')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('reseller_token')
    delete api.defaults.headers.common['Authorization']
    navigate('/login')
  }

  const handleGenerateLicense = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/reseller/licenses/generate', null, {
        params: {
          app_id: licenseForm.app_id,
          duration_days: licenseForm.duration_days,
          username: licenseForm.username || undefined,
          hwid: licenseForm.hwid || undefined
        }
      })

      alert(`License generated successfully!

License Key: ${response.data.license_key}

Cost: $${response.data.cost}
Remaining Credits: $${response.data.remaining_credits}`)
      
      setShowGenerateModal(false)
      setLicenseForm({ app_id: '', duration_days: 30, username: '', hwid: '' })
      fetchData()
    } catch (error) {
      console.error('Failed to generate license:', error)
      setError(error.response?.data?.detail || 'Failed to generate license')
    }
  }

  const handleRequestTopup = async (e) => {
    e.preventDefault()
    setError('')

    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      console.log('Submitting topup request...')
      console.log('Token:', localStorage.getItem('reseller_token') ? 'exists' : 'missing')
      
      const response = await api.post('/reseller/tickets', {
        title: `Credit Topup Request - $${topupAmount}`,
        description: `Requesting credit topup of $${topupAmount}`,
        ticket_type: 'topup_request',
        priority: 'high',
        topup_amount: parseFloat(topupAmount)
      })

      console.log('Topup request successful:', response.data)
      alert('Topup request submitted successfully!\n\nYou can view your ticket in "My Tickets" section.\n\nAn admin will review and approve your request.')
      setShowTopupModal(false)
      setTopupAmount('')
      fetchData()
    } catch (error) {
      console.error('Failed to request topup:', error)
      console.error('Error response:', error.response)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      
      let errorMsg = 'Failed to submit topup request'
      if (error.response?.status === 401) {
        errorMsg = 'Not authenticated. Please logout and login again.'
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail
      }
      setError(errorMsg)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reseller Portal</h1>
            <p className="text-muted-foreground mt-1">Welcome, {profile?.username}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/reseller/tickets')}>
              <Ticket className="mr-2 h-4 w-4" />
              My Tickets
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="text-2xl font-bold">{formatCurrency(profile?.credits || 0)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Button 
              onClick={() => { setShowTopupModal(true); setError(''); }} 
              variant="outline" 
              className="w-full mt-4"
              size="sm"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Request Topup
            </Button>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Apps</p>
                <p className="text-2xl font-bold">{apps.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Generated Licenses</p>
                <p className="text-2xl font-bold">{licenses.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Key className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Assigned Applications */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Assigned Applications</h2>
            {apps.length > 0 && (
              <Button onClick={() => setShowGenerateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate License
              </Button>
            )}
          </div>
          {apps.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No applications assigned yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apps.map((app) => (
                <div key={app.id} className="p-4 border border-border rounded-lg">
                  <h3 className="font-semibold">{app.name}</h3>
                  <p className="text-sm text-muted-foreground">Version: {app.version}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assigned: {new Date(app.assigned_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Licenses */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Recent Licenses</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Key</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.slice(0, 10).map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-mono text-sm">{license.key.substring(0, 16)}...</TableCell>
                  <TableCell>{license.app_name}</TableCell>
                  <TableCell>{license.username || '-'}</TableCell>
                  <TableCell>{new Date(license.expires_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={license.is_active ? 'success' : 'destructive'}>
                      {license.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Transaction History */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(tx.amount) >= 0 ? '+' : ''}{formatCurrency(parseFloat(tx.amount))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {formatCurrency(parseFloat(tx.balance_after))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Generate License Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Generate License</h2>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleGenerateLicense} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Application</label>
                    <select
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg"
                      value={licenseForm.app_id}
                      onChange={(e) => setLicenseForm({ ...licenseForm, app_id: e.target.value })}
                      required
                    >
                      <option value="">Select Application</option>
                      {apps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name} (v{app.version})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Duration (Days)"
                    type="number"
                    min="1"
                    value={licenseForm.duration_days}
                    onChange={(e) => setLicenseForm({ ...licenseForm, duration_days: parseInt(e.target.value) })}
                    required
                  />
                  <Input
                    label="Username (Optional)"
                    type="text"
                    value={licenseForm.username}
                    onChange={(e) => setLicenseForm({ ...licenseForm, username: e.target.value })}
                  />
                  <Input
                    label="HWID (Optional)"
                    type="text"
                    value={licenseForm.hwid}
                    onChange={(e) => setLicenseForm({ ...licenseForm, hwid: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Cost: ${licenseForm.duration_days} (${1}/day × {licenseForm.duration_days} days)
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Generate</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topup Request Modal */}
      <AnimatePresence>
        {showTopupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTopupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Request Credit Topup</h2>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleRequestTopup} className="space-y-4">
                  <Input
                    label="Topup Amount ($)"
                    type="number"
                    min="1"
                    step="0.01"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Submit a topup request to add credits to your account. 
                    An admin will review and approve your request.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setShowTopupModal(false); setTopupAmount(''); setError('') }}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Submit Request
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
