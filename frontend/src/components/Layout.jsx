import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  AppWindow,
  Key,
  Users,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  MessageSquare
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/apps', icon: AppWindow, label: 'Applications' },
  { path: '/licenses', icon: Key, label: 'Licenses' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/resellers', icon: Store, label: 'Resellers' },
  { path: '/tickets', icon: MessageSquare, label: 'Tickets' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/files', icon: FolderOpen, label: 'Files' },
  { path: '/settings', icon: Settings, label: 'Settings' }
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, admin } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || mobileMenuOpen) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`${
              mobileMenuOpen ? 'fixed' : 'relative'
            } w-64 bg-card border-r border-border z-50 flex flex-col`}
          >
            <div className="p-6 border-b border-border">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                SkyLine
              </h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="p-4 border-t border-border">
              <div className="mb-4 px-4 py-2 text-sm text-muted-foreground">
                {admin?.username || 'Admin'}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

