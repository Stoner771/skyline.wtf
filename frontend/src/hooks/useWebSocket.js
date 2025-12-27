import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(url, token, ticketId, options = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const ws = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const pingIntervalRef = useRef(null)

  const connect = useCallback(() => {
    if (!token || !ticketId) {
      return
    }
    
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    try {
      // Handle both http/https and ws/wss
      let wsUrl = url
      if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://')
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://')
      } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        // Default to ws if no protocol
        wsUrl = 'ws://' + url
      }
      
      const fullUrl = `${wsUrl}/ws/ticket/${ticketId}?token=${token}`
      ws.current = new WebSocket(fullUrl)

      ws.current.onopen = () => {
        setIsConnected(true)
        console.log('WebSocket connected')
        
        // Send ping every 30 seconds to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== 'pong') {
            setLastMessage(data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.current.onclose = () => {
        setIsConnected(false)
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        
        // Attempt to reconnect after 3 seconds
        if (options.reconnect !== false) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
    }
  }, [url, token, ticketId, options.reconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}

