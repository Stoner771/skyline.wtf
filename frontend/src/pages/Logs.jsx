import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { format } from 'date-fns'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterApp, setFilterApp] = useState('')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [logsRes, appsRes] = await Promise.all([
        api.get('/admin/logs/'),
        api.get('/admin/apps/')
      ])
      setLogs(logsRes.data || [])
      setApps(appsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setLogs([])
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesApp = !filterApp || log.app_id === parseInt(filterApp)
    const matchesAction = !filterAction || log.action === filterAction
    return matchesApp && matchesAction
  })

  const actionVariants = {
    login_success: 'success',
    login_failed: 'destructive',
    register: 'info',
    logout: 'default',
    license_login: 'info',
    ban: 'destructive'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const uniqueActions = [...new Set(logs.map((log) => log.action))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Logs</h1>
        <p className="text-muted-foreground">View system activity logs</p>
      </div>

      <Card>
        {logs.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No logs found.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
              const app = apps.find((a) => a.id === log.app_id)
              return (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={actionVariants[log.action] || 'default'}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{app?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <code className="text-xs">{log.ip_address || 'N/A'}</code>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.details || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </>
        )}
      </Card>
    </div>
  )
}

