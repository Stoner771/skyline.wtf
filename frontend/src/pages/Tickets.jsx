import { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import VoiceCall from '../components/VoiceCall'
import VideoCall from '../components/VideoCall'
import { MessageSquare, Paperclip, Link as LinkIcon, Video, Send, Filter, Trash2, Phone, PhoneOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isInVoiceCall, setIsInVoiceCall] = useState(false)
  const [isInVideoCall, setIsInVideoCall] = useState(false)
  const [voiceCallRequest, setVoiceCallRequest] = useState(null)
  const [videoCallRequest, setVideoCallRequest] = useState(null)
  const messagesEndRef = useRef(null)
  
  // WebRTC state
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isInitiator, setIsInitiator] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  
  const token = localStorage.getItem('token')
  const wsUrl = window.location.origin
  
  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, sendMessage: sendWSMessage } = useWebSocket(
    wsUrl,
    token,
    selectedTicket?.id,
    { reconnect: !!selectedTicket }
  )

  useEffect(() => {
    fetchTickets()
  }, [filter])

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom()
    }
  }, [selectedTicket?.messages])

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage || !selectedTicket) return

    if (lastMessage.type === 'new_message') {
      if (selectedTicket.id === lastMessage.ticket_id || !lastMessage.message?.ticket_id) {
        setSelectedTicket(prev => ({
          ...prev,
          messages: [...(prev.messages || []), lastMessage.message]
        }))
      }
      fetchTickets()
    } else if (lastMessage.type === 'voice_call_request') {
      setVoiceCallRequest(lastMessage.from)
    } else if (lastMessage.type === 'video_call_request') {
      setVideoCallRequest(lastMessage.from)
    } else if (lastMessage.type === 'voice_call_end' || lastMessage.type === 'video_call_end') {
      endCall()
      setVoiceCallRequest(null)
      setVideoCallRequest(null)
    } else if (lastMessage.type === 'video_signal') {
      handleVideoSignal(lastMessage.data)
    }
  }, [lastMessage, selectedTicket])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTickets = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const response = await api.get('/admin/tickets/', { params })
      setTickets(response.data)
      if (selectedTicket) {
        const updated = response.data.find(t => t.id === selectedTicket.id)
        if (updated) setSelectedTicket(updated)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectTicket = async (ticket) => {
    try {
      const response = await api.get(`/admin/tickets/${ticket.id}`)
      setSelectedTicket(response.data)
      setVoiceCallRequest(null)
      setVideoCallRequest(null)
    } catch (error) {
      console.error('Failed to fetch ticket details:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedTicket) return

    setSending(true)
    try {
      await api.post(`/admin/tickets/${selectedTicket.id}/messages`, {
        message: message.trim(),
        is_internal_note: false
      })
      setMessage('')
      // WebSocket will handle real-time update
      await selectTicket(selectedTicket)
      await fetchTickets()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const updateTicketStatus = async (status) => {
    try {
      await api.put(`/admin/tickets/${selectedTicket.id}`, { status })
      await fetchTickets()
      await selectTicket(selectedTicket)
    } catch (error) {
      console.error('Failed to update ticket:', error)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedTicket) return

    setUploading(true)
    try {
      // First create a message
      const messageResponse = await api.post(`/admin/tickets/${selectedTicket.id}/messages`, {
        message: `Uploaded: ${file.name}`,
        is_internal_note: false
      })

      // Then attach the file
      const formData = new FormData()
      formData.append('file', file)
      
      await api.post(
        `/admin/tickets/${selectedTicket.id}/messages/${messageResponse.data.id}/attachments`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )
      
      await selectTicket(selectedTicket)
      await fetchTickets()
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert('Failed to upload file: ' + (error.response?.data?.detail || error.message))
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleLinkUpload = async () => {
    const url = prompt('Enter link URL:')
    if (!url || !selectedTicket) return

    setUploading(true)
    try {
      const title = prompt('Enter link title (optional):') || url
      
      const messageResponse = await api.post(`/admin/tickets/${selectedTicket.id}/messages`, {
        message: `Shared link: ${title}`,
        is_internal_note: false
      })

      await api.post(
        `/admin/tickets/${selectedTicket.id}/messages/${messageResponse.data.id}/attachments`,
        {
          link_url: url,
          link_title: title,
          attachment_type: 'link'
        }
      )
      
      await selectTicket(selectedTicket)
      await fetchTickets()
    } catch (error) {
      console.error('Failed to upload link:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return
    
    try {
      await api.delete(`/admin/tickets/${ticketId}`)
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null)
      }
      await fetchTickets()
      alert('Ticket deleted successfully')
    } catch (error) {
      console.error('Failed to delete ticket:', error)
      alert('Failed to delete ticket: ' + (error.response?.data?.detail || error.message))
    }
  }

  // Voice/Video Call Functions
  const initializePeerConnection = (audioOnly = false) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
    pcRef.current = new RTCPeerConnection(configuration)

    pcRef.current.ontrack = (event) => {
      if (event.streams[0]) {
        setRemoteStream(event.streams[0])
        remoteStreamRef.current = event.streams[0]
      }
    }

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendWSMessage({
          type: 'video_signal',
          data: {
            type: 'ice-candidate',
            candidate: event.candidate
          }
        })
      }
    }
  }

  const startVoiceCall = async () => {
    try {
      setIsInitiator(true)
      setIsInVoiceCall(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      })
      localStreamRef.current = stream
      setLocalStream(stream)

      initializePeerConnection(true)

      stream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, stream)
      })

      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)

      sendWSMessage({
        type: 'voice_call_request',
        data: null
      })

      sendWSMessage({
        type: 'video_signal',
        data: {
          type: 'offer',
          offer: offer
        }
      })
    } catch (error) {
      console.error('Error starting voice call:', error)
      alert('Failed to start voice call. Please check your microphone permissions.')
      setIsInVoiceCall(false)
    }
  }

  const startVideoCall = async () => {
    try {
      setIsInitiator(true)
      setIsInVideoCall(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      localStreamRef.current = stream
      setLocalStream(stream)

      initializePeerConnection(false)

      stream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, stream)
      })

      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)

      sendWSMessage({
        type: 'video_call_request',
        data: null
      })

      sendWSMessage({
        type: 'video_signal',
        data: {
          type: 'offer',
          offer: offer
        }
      })
    } catch (error) {
      console.error('Error starting video call:', error)
      alert('Failed to start video call. Please check your camera and microphone permissions.')
      setIsInVideoCall(false)
    }
  }

  const handleVideoSignal = async (signal) => {
    if (!pcRef.current) {
      if (signal.type === 'offer') {
        try {
          setIsInitiator(false)
          setOtherUser(voiceCallRequest || videoCallRequest)
          
          const isVoice = !!voiceCallRequest
          if (isVoice) {
            setIsInVoiceCall(true)
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            localStreamRef.current = stream
            setLocalStream(stream)
            initializePeerConnection(true)
          } else {
            setIsInVideoCall(true)
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            localStreamRef.current = stream
            setLocalStream(stream)
            initializePeerConnection(false)
          }

          stream.getTracks().forEach(track => {
            pcRef.current.addTrack(track, stream)
          })

          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.offer))

          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)

          sendWSMessage({
            type: 'video_signal',
            data: {
              type: 'answer',
              answer: answer
            }
          })

          setVoiceCallRequest(null)
          setVideoCallRequest(null)
        } catch (error) {
          console.error('Error answering call:', error)
        }
      }
    } else {
      if (signal.type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === 'ice-candidate') {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    }
  }

  const answerVoiceCall = async () => {
    // The signal handler will process the offer when it arrives
    // Just mark that we're accepting the call
    setOtherUser(voiceCallRequest)
  }

  const answerVideoCall = async () => {
    // The signal handler will process the offer when it arrives
    setOtherUser(videoCallRequest)
  }

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop())
      remoteStreamRef.current = null
      setRemoteStream(null)
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    const wasInVoiceCall = isInVoiceCall
    const wasInVideoCall = isInVideoCall
    
    setIsInVoiceCall(false)
    setIsInVideoCall(false)
    setIsInitiator(false)
    setOtherUser(null)

    if (wasInVoiceCall || wasInVideoCall) {
      sendWSMessage({
        type: wasInVoiceCall ? 'voice_call_end' : 'video_call_end',
        data: null
      })
    }
  }

  const declineCall = () => {
    setVoiceCallRequest(null)
    setVideoCallRequest(null)
    sendWSMessage({
      type: 'voice_call_end',
      data: null
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-500/10 text-yellow-500',
      in_progress: 'bg-blue-500/10 text-blue-500',
      resolved: 'bg-green-500/10 text-green-500',
      closed: 'bg-gray-500/10 text-gray-500'
    }
    return colors[status] || colors.open
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-6">
      {/* Tickets List */}
      <div className="w-1/3 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold mb-4">Tickets {isConnected && <span className="text-green-500 text-sm">● Real-time</span>}</h2>
            <div className="flex gap-2">
              {['all', 'open', 'in_progress', 'resolved'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No tickets found
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                    selectedTicket?.id === ticket.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{ticket.title}</h3>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ticket.description || 'No description'}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatDate(ticket.created_at)}
                  </div>
                  {ticket.ticket_type === 'topup_request' && ticket.topup_amount && (
                    <div className="mt-2 text-sm font-semibold text-primary">
                      Top-up: ${parseFloat(ticket.topup_amount).toFixed(2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Ticket Details & Chat */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <Card className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-2xl font-bold">{selectedTicket.title}</h2>
                  <p className="text-muted-foreground mt-1">
                    {selectedTicket.description || 'No description'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status.replace('_', ' ')}
                  </Badge>
                  {selectedTicket.ticket_type === 'topup_request' && (
                    <Button
                      onClick={async () => {
                        try {
                          await api.post(`/admin/resellers/tickets/${selectedTicket.id}/approve-topup`)
                          await fetchTickets()
                          await selectTicket(selectedTicket)
                        } catch (error) {
                          console.error('Failed to approve topup:', error)
                          alert('Failed to approve top-up request')
                        }
                      }}
                    >
                      Approve Top-up
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTicketStatus('open')}
                  disabled={selectedTicket.status === 'open'}
                >
                  Open
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTicketStatus('in_progress')}
                  disabled={selectedTicket.status === 'in_progress'}
                >
                  In Progress
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTicketStatus('resolved')}
                  disabled={selectedTicket.status === 'resolved'}
                >
                  Resolve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkUpload()}
                  disabled={uploading}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startVoiceCall}
                  disabled={!isConnected || isInVoiceCall || isInVideoCall}
                  title={!isConnected ? 'WebSocket not connected' : 'Start voice call'}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Voice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startVideoCall}
                  disabled={!isConnected || isInVoiceCall || isInVideoCall}
                  title={!isConnected ? 'WebSocket not connected' : 'Start video call'}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTicket.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_type === 'admin'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {msg.sender_type === 'admin' ? 'You' : 'Reseller'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                    {msg.attachments?.map((att) => (
                      <div key={att.id} className="mt-2">
                        {att.attachment_type === 'file' ? (
                          <a
                            href={`/api/admin/tickets/attachments/${att.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm underline"
                          >
                            <Paperclip className="h-4 w-4" />
                            {att.file_name}
                          </a>
                        ) : (
                          <a
                            href={att.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm underline"
                          >
                            <LinkIcon className="h-4 w-4" />
                            {att.link_title}
                          </a>
                        )}
                      </div>
                    ))}
                    <div className="text-xs opacity-70 mt-1">
                      {formatDate(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <form onSubmit={sendMessage} className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" disabled={uploading}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a ticket to view conversation</p>
            </div>
          </Card>
        )}
      </div>

      {/* Voice Call Request Modal */}
      <AnimatePresence>
        {voiceCallRequest && !isInVoiceCall && !isInVideoCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4">Incoming Voice Call</h3>
              <p className="text-muted-foreground mb-6">
                {voiceCallRequest.username} is requesting a voice call
              </p>
              <div className="flex gap-3">
                <Button onClick={declineCall} variant="outline" className="flex-1">
                  Decline
                </Button>
                <Button onClick={answerVoiceCall} className="flex-1">
                  <Phone className="mr-2 h-4 w-4" />
                  Answer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Call Request Modal */}
      <AnimatePresence>
        {videoCallRequest && !isInVoiceCall && !isInVideoCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4">Incoming Video Call</h3>
              <p className="text-muted-foreground mb-6">
                {videoCallRequest.username} is requesting a video call
              </p>
              <div className="flex gap-3">
                <Button onClick={declineCall} variant="outline" className="flex-1">
                  Decline
                </Button>
                <Button onClick={answerVideoCall} className="flex-1">
                  <Video className="mr-2 h-4 w-4" />
                  Answer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Call Component */}
      {isInVoiceCall && !isInVideoCall && (
        <VoiceCall
          onClose={endCall}
          onSignal={sendWSMessage}
          localStream={localStream}
          remoteStream={remoteStream}
          isInitiator={isInitiator}
          otherUser={otherUser}
        />
      )}

      {/* Video Call Component */}
      {isInVideoCall && (
        <VideoCall
          onClose={endCall}
          onSignal={sendWSMessage}
          localStream={localStream}
          remoteStream={remoteStream}
          isInitiator={isInitiator}
        />
      )}
    </div>
  )
}
