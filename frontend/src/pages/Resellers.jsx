import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Plus, Trash2, Edit, DollarSign, Eye, X, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Resellers() {
  const [resellers, setResellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAppsModal, setShowAppsModal] = useState(false)
  const [selectedReseller, setSelectedReseller] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [applications, setApplications] = useState([])
  const [availableApps, setAvailableApps] = useState([])
  const [assignedApps, setAssignedApps] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    company_name: '',
    contact_person: '',
    phone: '',
    address: '',
    initial_credits: '0.00'
  })
  const [editFormData, setEditFormData] = useState({
    email: '',
    company_name: '',
    contact_person: '',
    phone: '',
    address: '',
    is_active: true,
    is_verified: false
  })
  const [creditData, setCreditData] = useState({
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchResellers()
  }, [])

  const fetchResellers = async () => {
    try {
      const response = await api.get('/admin/resellers/')
      setResellers(response.data)
    } catch (error) {
      console.error('Failed to fetch resellers:', error)
      setResellers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await api.get('/admin/apps/')
      setApplications(response.data)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const fetchResellerDetails = async (resellerId) => {
    try {
      const [resellerRes, transactionsRes, appsRes] = await Promise.all([
        api.get(`/admin/resellers/${resellerId}`),
        api.get(`/admin/resellers/${resellerId}/transactions`),
        api.get(`/admin/resellers/${resellerId}/apps`)
      ])
      setSelectedReseller(resellerRes.data)
      setTransactions(transactionsRes.data)
      setAssignedApps(appsRes.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Failed to fetch reseller details:', error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const payload = {
        ...formData,
        initial_credits: parseFloat(formData.initial_credits) || 0
      }
      await api.post('/admin/resellers/', payload)
      setShowModal(false)
      setFormData({
        username: '',
        email: '',
        password: '',
        company_name: '',
        contact_person: '',
        phone: '',
        address: '',
        initial_credits: '0.00'
      })
      setError('')
      await fetchResellers()
    } catch (error) {
      console.error('Failed to create reseller:', error)
      let errorMessage = 'Failed to create reseller'
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail)
      }
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleAssignCredits = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/admin/resellers/${selectedReseller.id}/credits`, {
        amount: parseFloat(creditData.amount),
        description: creditData.description
      })
      setShowCreditsModal(false)
      setCreditData({ amount: '', description: '' })
      setSelectedReseller(null)
      await fetchResellers()
    } catch (error) {
      console.error('Failed to assign credits:', error)
      let errorMessage = 'Failed to assign credits'
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail)
      }
      setError(errorMessage)
    }
  }

  const handleEdit = async (reseller) => {
    setSelectedReseller(reseller)
    setEditFormData({
      email: reseller.email,
      company_name: reseller.company_name || '',
      contact_person: reseller.contact_person || '',
      phone: reseller.phone || '',
      address: reseller.address || '',
      is_active: reseller.is_active,
      is_verified: reseller.is_verified
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.put(`/admin/resellers/${selectedReseller.id}`, editFormData)
      setShowEditModal(false)
      setSelectedReseller(null)
      await fetchResellers()
    } catch (error) {
      console.error('Failed to update reseller:', error)
      setError(error.response?.data?.detail || 'Failed to update reseller')
    }
  }

  const handleDelete = async (reseller) => {
    if (!window.confirm(`Are you sure you want to delete reseller "${reseller.username}"? This action cannot be undone.`)) {
      return
    }
    try {
      await api.delete(`/admin/resellers/${reseller.id}`)
      await fetchResellers()
    } catch (error) {
      console.error('Failed to delete reseller:', error)
      alert('Failed to delete reseller')
    }
  }

  const handleManageApps = async (reseller) => {
    setSelectedReseller(reseller)
    await fetchApplications()
    try {
      const response = await api.get(`/admin/resellers/${reseller.id}/apps`)
      setAssignedApps(response.data)
    } catch (error) {
      console.error('Failed to fetch assigned apps:', error)
    }
    setShowAppsModal(true)
  }

  const handleAssignApp = async (appId) => {
    try {
      await api.post(`/admin/resellers/${selectedReseller.id}/apps/${appId}`)
      const response = await api.get(`/admin/resellers/${selectedReseller.id}/apps`)
      setAssignedApps(response.data)
    } catch (error) {
      console.error('Failed to assign app:', error)
      alert('Failed to assign application')
    }
  }

  const handleRemoveApp = async (appId) => {
    try {
      await api.delete(`/admin/resellers/${selectedReseller.id}/apps/${appId}`)
      const response = await api.get(`/admin/resellers/${selectedReseller.id}/apps`)
      setAssignedApps(response.data)
    } catch (error) {
      console.error('Failed to remove app:', error)
      alert('Failed to remove application')
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Resellers</h1>
          <p className="text-muted-foreground mt-1">Manage your resellers and credit system</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Reseller
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No resellers found
                </TableCell>
              </TableRow>
            ) : (
              resellers.map((reseller) => (
                <TableRow key={reseller.id}>
                  <TableCell className="font-medium">{reseller.username}</TableCell>
                  <TableCell>{reseller.email}</TableCell>
                  <TableCell>{reseller.company_name || '-'}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(parseFloat(reseller.credits))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reseller.is_active ? 'success' : 'destructive'}>
                      {reseller.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(reseller.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReseller(reseller)
                          setShowCreditsModal(true)
                        }}
                        title="Assign Credits"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageApps(reseller)}
                        title="Manage Applications"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchResellerDetails(reseller.id)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(reseller)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(reseller)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Reseller Modal */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create Reseller</h2>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Company Name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                    <Input
                      label="Contact Person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Input
                      label="Initial Credits"
                      type="number"
                      step="0.01"
                      value={formData.initial_credits}
                      onChange={(e) => setFormData({ ...formData, initial_credits: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Credits Modal */}
      <AnimatePresence>
        {showCreditsModal && selectedReseller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreditsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  Assign Credits to {selectedReseller.username}
                </h2>
                <p className="text-muted-foreground mb-4">
                  Current Balance: {formatCurrency(parseFloat(selectedReseller.credits))}
                </p>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleAssignCredits} className="space-y-4">
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={creditData.amount}
                    onChange={(e) => setCreditData({ ...creditData, amount: e.target.value })}
                    required
                  />
                  <Input
                    label="Description"
                    value={creditData.description}
                    onChange={(e) => setCreditData({ ...creditData, description: e.target.value })}
                  />
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowCreditsModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Assign Credits</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedReseller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Reseller Details</h2>
                  <Button variant="outline" size="sm" onClick={() => setShowDetailsModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm text-muted-foreground">Username</label>
                    <p className="font-medium">{selectedReseller.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{selectedReseller.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Company</label>
                    <p className="font-medium">{selectedReseller.company_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Contact Person</label>
                    <p className="font-medium">{selectedReseller.contact_person || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <p className="font-medium">{selectedReseller.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Credits</label>
                    <p className="font-semibold text-primary">
                      {formatCurrency(parseFloat(selectedReseller.credits))}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Assigned Applications</h3>
                  {assignedApps.length === 0 ? (
                    <p className="text-muted-foreground">No applications assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedApps.map((app) => (
                        <Badge key={app.id} variant="default">{app.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
                  {transactions.length === 0 ? (
                    <p className="text-muted-foreground">No transactions</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transactions.map((tx) => (
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
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Reseller Modal */}
      <AnimatePresence>
        {showEditModal && selectedReseller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-2xl w-full"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Edit Reseller: {selectedReseller.username}</h2>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleUpdate} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Company Name"
                      value={editFormData.company_name}
                      onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                    />
                    <Input
                      label="Contact Person"
                      value={editFormData.contact_person}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                  <Input
                    label="Address"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editFormData.is_active}
                        onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editFormData.is_verified}
                        onChange={(e) => setEditFormData({ ...editFormData, is_verified: e.target.checked })}
                        className="rounded"
                      />
                      <span>Verified</span>
                    </label>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Applications Modal */}
      <AnimatePresence>
        {showAppsModal && selectedReseller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAppsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-lg shadow-xl max-w-2xl w-full"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Manage Applications: {selectedReseller.username}</h2>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Assigned Applications</h3>
                  {assignedApps.length === 0 ? (
                    <p className="text-muted-foreground">No applications assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {assignedApps.map((app) => (
                        <div key={app.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-sm text-muted-foreground">v{app.version}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveApp(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Available Applications</h3>
                  {applications.filter(app => !assignedApps.some(a => a.id === app.id)).length === 0 ? (
                    <p className="text-muted-foreground">All applications assigned</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {applications
                        .filter(app => !assignedApps.some(a => a.id === app.id))
                        .map((app) => (
                          <div key={app.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                            <div>
                              <p className="font-medium">{app.name}</p>
                              <p className="text-sm text-muted-foreground">v{app.version}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignApp(app.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Assign
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={() => setShowAppsModal(false)}>Close</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}