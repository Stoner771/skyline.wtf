import { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { Upload, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

export default function Files() {
  const [files, setFiles] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [filesRes, appsRes] = await Promise.all([
        api.get('/admin/files/'),
        api.get('/admin/apps/')
      ])
      setFiles(filesRes.data || [])
      setApps(appsRes.data || [])
      if (appsRes.data && appsRes.data.length > 0 && !selectedApp) {
        setSelectedApp(appsRes.data[0].id.toString())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setFiles([])
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!selectedApp) {
      alert('Please select an application first')
      e.target.value = ''
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('app_id', selectedApp)

    try {
      await api.post('/admin/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      await fetchData()
      alert('File uploaded successfully')
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert('Failed to upload file: ' + (error.response?.data?.detail || error.message))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    try {
      await api.delete(`/admin/files/${id}`)
      fetchData()
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const filteredFiles = files.filter(
    (file) => !selectedApp || file.app_id === parseInt(selectedApp) || selectedApp === ''
  )

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
          <h1 className="text-3xl font-bold mb-2">Files</h1>
          <p className="text-muted-foreground">Manage application files</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Applications</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id.toString()}>
                {app.name}
              </option>
            ))}
          </select>
          <label>
            <input
              type="file"
              onChange={handleUpload}
              className="hidden"
              disabled={!selectedApp || uploading}
            />
            <Button as="span" disabled={!selectedApp || uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </label>
        </div>
      </div>

      <Card>
        {filteredFiles.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No files found. Upload your first file to get started.</p>
          </div>
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file) => {
              const app = apps.find((a) => a.id === file.app_id)
              return (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">{file.filename}</TableCell>
                  <TableCell>{app?.name || 'N/A'}</TableCell>
                  <TableCell>{formatFileSize(file.file_size)}</TableCell>
                  <TableCell>
                    <Badge variant="info">{file.mime_type || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(file.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.open(`/api/admin/files/download/${file.id}`, '_blank')}
                        className="p-2 hover:bg-accent rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
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
        )}
      </Card>
    </div>
  )
}

