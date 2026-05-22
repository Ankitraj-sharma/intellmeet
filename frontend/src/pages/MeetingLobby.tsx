import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, Settings, Users, ArrowRight, Zap } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function MeetingLobby() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}`).then(r => r.data.data.meeting),
    enabled: !!meetingId,
  })

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(s => setStream(s))
          .catch(() => toast.error('Could not access camera/microphone'))
      })
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setIsVideoOff(!isVideoOff)
    }
  }

  const joinMeeting = async () => {
    try {
      setIsJoining(true)
      await api.post(`/meetings/${meetingId}/join`)
      stream?.getTracks().forEach(t => t.stop())
      navigate(`/meeting/${meetingId}`)
    } catch {
      toast.error('Failed to join meeting')
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 p-6">
        <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-white font-bold">IntellMeet</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-8 items-center">

            {/* Video preview */}
            <div className="space-y-4">
              <div className="relative aspect-video bg-[#1a1a2e] rounded-2xl overflow-hidden border border-slate-800">
                {!isVideoOff ? (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} alt="" />
                    </div>
                    <p className="text-slate-400 text-sm">Camera is off</p>
                  </div>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    onClick={toggleMute}
                    className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                <span className={`flex items-center gap-1.5 ${isMuted ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {isMuted ? 'Muted' : 'Mic on'}
                </span>
                <span className="text-slate-700">•</span>
                <span className={`flex items-center gap-1.5 ${isVideoOff ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                  {isVideoOff ? 'Camera off' : 'Camera on'}
                </span>
              </div>
            </div>

            {/* Info & join */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-slate-800 rounded-xl w-2/3" />
                  <div className="h-4 bg-slate-800 rounded-xl w-1/2" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">You're about to join</p>
                    <h1 className="text-3xl font-bold text-white">{data?.title}</h1>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <Users size={14} />
                        {data?.participants?.length || 0} participant{data?.participants?.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="text-slate-400 text-sm font-mono text-xs tracking-wider">
                        ID: {meetingId}
                      </span>
                    </div>
                  </div>

                  {/* Participants preview */}
                  {data?.participants?.length > 0 && (
                    <div className="card p-4">
                      <p className="text-sm text-slate-400 mb-3">Already in meeting:</p>
                      <div className="flex flex-wrap gap-2">
                        {data.participants.slice(0, 6).map((p: any) => (
                          <div key={p._id} className="flex items-center gap-2">
                            <img
                              src={p.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${p.user?.name}`}
                              className="w-7 h-7 rounded-full"
                              alt=""
                            />
                            <span className="text-xs text-slate-300">{p.user?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={joinMeeting}
                      disabled={isJoining}
                      className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-60"
                    >
                      {isJoining ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Join Meeting <ArrowRight size={18} /></>
                      )}
                    </button>
                    <p className="text-center text-xs text-slate-500">
                      By joining, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
