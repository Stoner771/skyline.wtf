import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Users, Key, Ban, AppWindow, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.warn('Failed to fetch stats (non-critical):', error.response?.status || error.message)
      // Set default stats if API fails - don't let this break the page
      setStats({
        apps: 0,
        total_users: 0,
        banned_users: 0,
        total_licenses: 0,
        active_licenses: 0
      })
      // Don't throw or redirect - just show empty stats
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Applications',
      value: stats?.apps || 0,
      icon: AppWindow,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Active Licenses',
      value: stats?.active_licenses || 0,
      icon: Key,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Banned Users',
      value: stats?.banned_users || 0,
      icon: Ban,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    }
  ]

  const chartData = [
    { name: 'Mon', users: 12, licenses: 8 },
    { name: 'Tue', users: 19, licenses: 15 },
    { name: 'Wed', users: 15, licenses: 12 },
    { name: 'Thu', users: 25, licenses: 20 },
    { name: 'Fri', users: 22, licenses: 18 },
    { name: 'Sat', users: 18, licenses: 14 },
    { name: 'Sun', users: 20, licenses: 16 }
  ]

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
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your authentication platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">User Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="users" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">License Usage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="licenses"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

