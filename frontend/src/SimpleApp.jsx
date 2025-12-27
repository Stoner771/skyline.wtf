// Simple test app to verify React is working
import React from 'react'

export default function SimpleApp() {
  return (
    <div style={{
      padding: '50px',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#4a9eff', fontSize: '2.5rem', marginBottom: '20px' }}>
        SkyLineentication
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
        ✅ React is loading correctly!
      </p>
      <p style={{ color: '#888', marginBottom: '30px' }}>
        Current time: {new Date().toLocaleTimeString()}
      </p>
      <div style={{
        padding: '20px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <p style={{ marginBottom: '10px' }}>If you see this message, React is working!</p>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          The full application should load automatically. If it doesn't, check the browser console (F12) for errors.
        </p>
      </div>
    </div>
  )
}

