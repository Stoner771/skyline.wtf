import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('🚀 Main.jsx loading...')
console.log('📍 Root element:', document.getElementById('root'))

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
  document.body.innerHTML = '<h1 style="padding: 20px; color: red; background: #1a1a1a;">Root element not found!</h1>'
} else {
  // Load the full app with better error handling
  const loadApp = async () => {
    try {
      console.log('📦 Loading App component...')
      const AppModule = await import('./App.jsx')
      const App = AppModule.default
      console.log('✅ App.jsx loaded successfully')
      
      const root = ReactDOM.createRoot(rootElement)
      console.log('🎨 Rendering App...')
      
      // Wrap in error boundary at root level
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      )
      console.log('✅ App rendered successfully!')
    } catch (error) {
      console.error('❌ Error loading/rendering App.jsx:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      // Show error on page
      rootElement.innerHTML = `
        <div style="padding: 30px; font-family: system-ui; background: #0a0a0a; color: #fff; min-height: 100vh;">
          <h1 style="color: #ff4444; font-size: 2rem; margin-bottom: 20px;">⚠️ Error Loading Application</h1>
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff4444;">
            <p style="margin-bottom: 10px;"><strong>Error Message:</strong></p>
            <p style="color: #ff8888; margin-bottom: 20px;">${error.message}</p>
            <details style="margin-top: 10px;">
              <summary style="cursor: pointer; color: #4a9eff;">Show Error Stack</summary>
              <pre style="background: #2a2a2a; padding: 15px; border-radius: 5px; overflow: auto; margin-top: 10px; font-size: 12px; color: #ccc;">${error.stack}</pre>
            </details>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.location.reload()" style="padding: 12px 24px; background: #4a9eff; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              🔄 Reload Page
            </button>
            <button onclick="console.clear(); window.location.reload()" style="padding: 12px 24px; background: #666; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              🧹 Clear & Reload
            </button>
          </div>
          <p style="margin-top: 20px; color: #888; font-size: 14px;">
            💡 <strong>Tip:</strong> Open Developer Tools (F12) and check the Console tab for more details.
          </p>
        </div>
      `
    }
  }
  
  loadApp()
}

