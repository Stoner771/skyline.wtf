import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Ban, Unlock, Trash2, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function Users() {
  const [users, setUsers] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterApp, setFilterApp] = useState('')
  const [filterBanned, setFilterBanned] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, appsRes] = await Promise.all([
        api.get('/admin/users/'),
        api.get('/admin/apps/')
      ])
      setUsers(usersRes.data)
      setApps(appsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async (userId, reason) => {
    const banReason = prompt('Enter ban reason (optional):')
    try {
      await api.post('/admin/users/ban', {
        user_id: userId,
        reason: banReason || null
      })
      fetchData()
    } catch (error) {
      console.error('Failed to ban user:', error)
    }
  }

  const handleUnban = async (userId) => {
    try {
      await api.post('/admin/users/unban', { user_id: userId })
      fetchData()
    } catch (error) {
      console.error('Failed to unban user:', error)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      fetchData()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesApp = !filterApp || user.app_id === parseInt(filterApp)
    const matchesBanned =
      filterBanned === '' ||
      (filterBanned === 'true' && user.is_banned) ||
      (filterBanned === 'false' && !user.is_banned)
    return matchesSearch && matchesApp && matchesBanned
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Users</h1>
        <p className="text-muted-foreground">Manage user accounts</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Applications</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
          <select
            value={filterBanned}
            onChange={(e) => setFilterBanned(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>HWID</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const app = apps.find((a) => a.id === user.app_id)
              const isExpired =
                user.expiry_timestamp && new Date(user.expiry_timestamp) < new Date()
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>{app?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {user.hwid ? (
                      <code className="text-xs">{user.hwid.substring(0, 16)}...</code>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.expiry_timestamp
                      ? format(new Date(user.expiry_timestamp), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.is_banned
                          ? 'destructive'
                          : isExpired
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {user.is_banned
                        ? 'Banned'
                        : isExpired
                        ? 'Expired'
                        : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          className="p-2 hover:bg-green-500/10 rounded text-green-400"
                          title="Unban"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user.id)}
                          className="p-2 hover:bg-destructive/10 rounded text-destructive"
                          title="Ban"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-destructive/10 rounded text-destructive"
                        title="Delete"
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
      </Card>
    </div>
  )
}

