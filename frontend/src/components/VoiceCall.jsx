import { useEffect, useRef, useState } from 'react'
import { X, PhoneOff, Mic, MicOff, Phone } from 'lucide-react'
import Button from './ui/Button'

export default function VoiceCall({ onClose, onSignal, localStream, remoteStream, isInitiator, otherUser }) {
  const remoteAudioRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    }
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null
      }
    }
  }, [remoteStream])

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Voice Call</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {otherUser ? `Talking with ${otherUser.username}` : 'Connecting...'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Audio Element (hidden) */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Status Indicator */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
              remoteStream ? 'bg-green-500/20' : 'bg-muted'
            }`}>
              <Phone className={`h-12 w-12 ${remoteStream ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            {remoteStream && (
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          <p className="text-lg font-semibold">
            {remoteStream ? 'Connected' : 'Connecting...'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isMuted ? 'You are muted' : 'You are speaking'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            onClick={toggleMute}
            className="rounded-full p-4"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            onClick={onClose}
            className="rounded-full p-4"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}