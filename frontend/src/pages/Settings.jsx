import { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Save } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    jwt_secret: '',
    encryption_key: '',
    database_url: ''
  })

  const handleSave = () => {
    // Settings would typically be saved server-side
    alert('Settings saved! (This is a demo - settings are managed server-side)')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your authentication platform</p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">JWT Secret</label>
            <Input
              type="password"
              value={settings.jwt_secret}
              onChange={(e) => setSettings({ ...settings, jwt_secret: e.target.value })}
              placeholder="Enter JWT secret key"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for signing JWT tokens
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Encryption Key</label>
            <Input
              type="password"
              value={settings.encryption_key}
              onChange={(e) => setSettings({ ...settings, encryption_key: e.target.value })}
              placeholder="Enter encryption key (32 characters)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for AES encryption of API responses
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Database Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Database URL</label>
            <Input
              type="text"
              value={settings.database_url}
              onChange={(e) => setSettings({ ...settings, database_url: e.target.value })}
              placeholder="mysql+pymysql://user:pass@host:port/db"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Database connection string
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}

