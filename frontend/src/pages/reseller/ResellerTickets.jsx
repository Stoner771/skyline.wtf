import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useWebSocket } from '../../hooks/useWebSocket'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import VideoCall from '../../components/VideoCall'
import { ArrowLeft, MessageSquare, DollarSign, Send, Video, PhoneOff, Phone, Paperclip } from 'lucide-react'
import VoiceCall from '../../components/VoiceCall'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResellerTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isInVideoCall, setIsInVideoCall] = useState(false)
  const [isInVoiceCall, setIsInVoiceCall] = useState(false)
  const [videoCallRequest, setVideoCallRequest] = useState(null)
  const [voiceCallRequest, setVoiceCallRequest] = useState(null)
  const navigate = useNavigate()
  
  // WebRTC state
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isInitiator, setIsInitiator] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  
  const token = localStorage.getItem('reseller_token')
  const wsUrl = window.location.origin
  
  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, sendMessage: sendWSMessage } = useWebSocket(
    wsUrl,
    token,
    selectedTicket?.id,
    { reconnect: !!selectedTicket }
  )

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchTickets()
  }, [])

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'new_message') {
      // Add new message to selected ticket
      if (selectedTicket && selectedTicket.id === lastMessage.message?.ticket_id) {
        setSelectedTicket(prev => ({
          ...prev,
          messages: [...(prev.messages || []), lastMessage.message]
        }))
      }
      // Refresh ticket list
      fetchTickets()
    } else if (lastMessage.type === 'voice_call_request') {
      setVoiceCallRequest(lastMessage.from)
    } else if (lastMessage.type === 'video_call_request') {
      setVideoCallRequest(lastMessage.from)
    } else if (lastMessage.type === 'video_call_end' || lastMessage.type === 'voice_call_end') {
      endVideoCall()
      setVideoCallRequest(null)
      setVoiceCallRequest(null)
    } else if (lastMessage.type === 'video_signal') {
      handleVideoSignal(lastMessage.data)
    }
  }, [lastMessage])

  const fetchTickets = async () => {
    try {
      const response = await api.get('/reseller/tickets')
      setTickets(response.data)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      open: 'warning',
      in_progress: 'info',
      resolved: 'success',
      closed: 'default'
    }
    return variants[status] || 'default'
  }

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'destructive'
    }
    return variants[priority] || 'default'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const selectTicket = async (ticket) => {
    try {
      const response = await api.get(`/reseller/tickets/${ticket.id}`)
      setSelectedTicket(response.data)
      setMessage('')
      setVideoCallRequest(null)
    } catch (error) {
      console.error('Failed to fetch ticket details:', error)
      setSelectedTicket(ticket)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedTicket || sending) return

    setSending(true)
    try {
      await api.post(`/reseller/tickets/${selectedTicket.id}/messages`, {
        message: message.trim(),
        is_internal_note: false
      })
      setMessage('')
      // WebSocket will handle real-time update, but refresh to be safe
      await selectTicket(selectedTicket)
      await fetchTickets()
    } catch (error) {
      console.error('Failed to send message:', error)
      alert(error.response?.data?.detail || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedTicket) return

    setUploading(true)
    try {
      const messageResponse = await api.post(`/reseller/tickets/${selectedTicket.id}/messages`, {
        message: `Uploaded: ${file.name}`,
        is_internal_note: false
      })

      const formData = new FormData()
      formData.append('file', file)
      
      await api.post(
        `/reseller/tickets/${selectedTicket.id}/messages/${messageResponse.data.id}/attachments`,
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
      e.target.value = ''
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
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      localStreamRef.current = stream
      setLocalStream(stream)

      // Initialize peer connection
      initializePeerConnection()

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, stream)
      })

      // Create offer
      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)

      // Send offer via WebSocket
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

      setIsInVideoCall(true)
    } catch (error) {
      console.error('Error starting video call:', error)
      alert('Failed to start video call. Please check your camera and microphone permissions.')
    }
  }

  const handleVideoSignal = async (signal) => {
    if (!pcRef.current) {
      if (signal.type === 'offer') {
        // We're receiving a call
        try {
          setIsInitiator(false)
          
          // Get user media
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          })
          localStreamRef.current = stream
          setLocalStream(stream)

          // Initialize peer connection
          initializePeerConnection()

          // Add local tracks
          stream.getTracks().forEach(track => {
            pcRef.current.addTrack(track, stream)
          })

          // Set remote description
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.offer))

          // Create answer
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)

          // Send answer
          sendWSMessage({
            type: 'video_signal',
            data: {
              type: 'answer',
              answer: answer
            }
          })

          setIsInVideoCall(true)
          setVideoCallRequest(null)
        } catch (error) {
          console.error('Error answering video call:', error)
        }
      }
    } else {
      // Handle signaling
      if (signal.type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === 'ice-candidate') {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    }
  }

  const answerVideoCall = async () => {
    if (videoCallRequest) {
      // The signal handler will set up the call when offer arrives
      setVideoCallRequest(null)
    }
  }

  const endVideoCall = () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/reseller/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">My Support Tickets</h1>
            <p className="text-muted-foreground mt-1">
              View your submitted tickets and topup requests
              {isConnected && <span className="ml-2 text-green-500">● Real-time</span>}
            </p>
          </div>
        </div>

        {/* Tickets Table */}
        <Card>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No tickets found</p>
              <p className="text-sm text-muted-foreground mt-2">Your support tickets and topup requests will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>
                      {ticket.title}
                      {ticket.ticket_type === 'topup_request' && ticket.topup_amount && (
                        <span className="ml-2 text-green-400 font-semibold">
                          ${parseFloat(ticket.topup_amount).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {ticket.ticket_type === 'topup_request' ? 'Topup Request' :
                         ticket.ticket_type.charAt(0).toUpperCase() + ticket.ticket_type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadge(ticket.priority)}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(ticket.status)}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectTicket(ticket)}
                      >
                        <MessageSquare className="mr-2 h-3 w-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
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
          onClose={endVideoCall}
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
          onClose={endVideoCall}
          onSignal={sendWSMessage}
          localStream={localStream}
          remoteStream={remoteStream}
          isInitiator={isInitiator}
        />
      )}

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && !isInVideoCall && !isInVoiceCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedTicket(null)
              setMessage('')
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Ticket #{selectedTicket.id}</h2>
                  <p className="text-muted-foreground">{selectedTicket.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadge(selectedTicket.status)}>
                    {selectedTicket.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {selectedTicket.status !== 'closed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startVoiceCall}
                        disabled={!isConnected || isInVoiceCall || isInVideoCall}
                        title={!isConnected ? 'WebSocket not connected' : 'Start voice call'}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Voice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startVideoCall}
                        disabled={!isConnected || isInVoiceCall || isInVideoCall}
                        title={!isConnected ? 'WebSocket not connected' : 'Start video call'}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Video
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedTicket.description || 'No description provided'}</p>
                </div>

                {selectedTicket.ticket_type === 'topup_request' && selectedTicket.topup_amount && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      <span className="font-semibold text-green-400">
                        Topup Amount: ${parseFloat(selectedTicket.topup_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">
                      {selectedTicket.ticket_type === 'topup_request' ? 'Topup Request' : 
                       selectedTicket.ticket_type.charAt(0).toUpperCase() + selectedTicket.ticket_type.slice(1)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority:</span>
                    <p className="font-medium">{selectedTicket.priority.toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">{formatDate(selectedTicket.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <p className="font-medium">{formatDate(selectedTicket.updated_at)}</p>
                  </div>
                </div>

                {selectedTicket.status === 'resolved' && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 font-medium">
                      ✓ This ticket has been resolved
                      {selectedTicket.resolved_at && (
                        <span className="block text-sm mt-1">
                          Resolved on {formatDate(selectedTicket.resolved_at)}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-2">Messages</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((msg) => (
                        <div key={msg.id} className={`p-3 rounded ${
                          msg.sender_type === 'admin' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {msg.sender_type === 'admin' ? 'Admin' : 'You'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <div key={att.id}>
                                  {att.attachment_type === 'file' ? (
                                    <a
                                      href={`/api/reseller/tickets/${selectedTicket.id}/attachments/${att.id}/download`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm underline"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {att.file_name}
                                    </a>
                                  ) : (
                                    <a
                                      href={att.link_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm underline"
                                    >
                                      🔗 {att.link_title}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                    )}
                  </div>

                  {/* Message Input - only show if ticket is not closed */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="border-t border-border pt-4">
                      <h3 className="font-semibold mb-2">Add Message</h3>
                      <form onSubmit={sendMessage} className="space-y-2">
                        <label className="cursor-pointer inline-block">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                          <Button type="button" variant="outline" size="sm" disabled={uploading}>
                            <Paperclip className="mr-2 h-4 w-4" />
                            {uploading ? 'Uploading...' : 'Attach File'}
                          </Button>
                        </label>
                        <textarea
                          className="w-full px-4 py-2 bg-input border border-border rounded-lg resize-none"
                          rows={3}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message here..."
                          disabled={sending}
                        />
                        <div className="flex justify-end">
                          <Button type="submit" disabled={sending || !message.trim()}>
                            <Send className="mr-2 h-4 w-4" />
                            {sending ? 'Sending...' : 'Send Message'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => {
                  setSelectedTicket(null)
                  setMessage('')
                }}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
