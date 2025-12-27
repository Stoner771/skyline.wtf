import { useEffect, useRef, useState } from 'react'
import { X, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import Button from './ui/Button'

export default function VideoCall({ onClose, onSignal, localStream, remoteStream, isInitiator }) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
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

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-black/50">
          <h3 className="text-white font-semibold">Video Call</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (Picture in Picture) */}
          {localStream && (
            <div className="absolute bottom-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 p-6 bg-black/50">
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
          
          <Button
            variant={isVideoOff ? "destructive" : "outline"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full p-4"
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

