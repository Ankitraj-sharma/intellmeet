import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, FileText, Phone, MoreHorizontal,
  Copy, Hand, Smile, Layout, Maximize2, Brain
} from 'lucide-react'
import { getSocket } from '@/services/socket'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useMeetingStore } from '@/store/meetingStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/format'

type PanelType = 'chat' | 'participants' | 'transcript' | 'notes' | 'ai' | null

const VideoTile = ({ stream, name, isMuted, isVideoOff, isLocal = false }: {
  stream?: MediaStream; name: string; isMuted: boolean; isVideoOff: boolean; isLocal?: boolean
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative bg-[#1a1a2e] rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800/60 group">
      {!isVideoOff && stream ? (
        <video
          ref={videoRef} autoPlay playsInline
          muted={isLocal}
          className={cn("w-full h-full object-cover", isLocal && "scale-x-[-1]")}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-slate-700">
            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${name}`} alt="" />
          </div>
          <span className="text-slate-300 text-sm font-medium">{name}</span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">{name}</span>
        {isMuted && <div className="bg-red-500/80 p-1 rounded-full"><MicOff size={10} className="text-white" /></div>}
        {isLocal && <div className="bg-indigo-500/80 px-2 py-0.5 rounded-full text-[10px] text-white">You</div>}
      </div>
    </div>
  )
}

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const {
    isMuted, isVideoOff, isScreenSharing, chatMessages, transcript,
    notes, localStream, participants, setNotes, addChatMessage, addTranscriptSegment
  } = useMeetingStore()

  const { initLocalStream, makeCall, answerCall, handleAnswer, handleIceCandidate, toggleMute, toggleVideo, startScreenShare, cleanup } = useWebRTC(meetingId!)

  const [panel, setPanel] = useState<PanelType>('chat')
  const [chatInput, setChatInput] = useState('')
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Initialize meeting
  useEffect(() => {
    if (!meetingId) return
    initLocalStream().catch(err => toast.error(err.message))

    const socket = getSocket()
    if (!socket) return

    socket.emit('meeting:join', { meetingId })

    socket.on('meeting:user-joined', ({ user: joinedUser, socketId }) => {
      toast.success(`${joinedUser.name} joined`, { icon: '👋' })
      setTimeout(() => makeCall(socketId, joinedUser), 500)
    })
    socket.on('meeting:user-left', ({ userId }) => {
      useMeetingStore.getState().removeParticipant(userId)
    })
    socket.on('webrtc:offer', ({ offer, fromSocketId, fromUser }) => answerCall(fromSocketId, fromUser, offer))
    socket.on('webrtc:answer', ({ answer, fromSocketId }) => handleAnswer(fromSocketId, answer))
    socket.on('webrtc:ice-candidate', ({ candidate, fromSocketId }) => handleIceCandidate(fromSocketId, candidate))
    socket.on('chat:message', (msg) => addChatMessage(msg))
    socket.on('transcript:segment', (seg) => addTranscriptSegment(seg))
    socket.on('notes:updated', ({ content }) => setNotes(content))
    socket.on('meeting:reaction', ({ name, emoji }) => toast(`${name}: ${emoji}`, { duration: 2000 }))
    socket.on('meeting:user-audio-changed', ({ userId, isMuted }) => {
      useMeetingStore.getState().updateParticipant(userId, { isMuted })
    })
    socket.on('meeting:user-video-changed', ({ userId, isVideoOff }) => {
      useMeetingStore.getState().updateParticipant(userId, { isVideoOff })
    })

    return () => {
      socket.emit('meeting:leave', { meetingId })
      socket.off('meeting:user-joined')
      socket.off('meeting:user-left')
      socket.off('webrtc:offer')
      socket.off('webrtc:answer')
      socket.off('webrtc:ice-candidate')
      socket.off('chat:message')
      socket.off('transcript:segment')
      socket.off('notes:updated')
      socket.off('meeting:reaction')
      cleanup()
      useMeetingStore.getState().resetMeeting()
    }
  }, [meetingId])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendChat = () => {
    if (!chatInput.trim()) return
    getSocket()?.emit('chat:send', { meetingId, message: chatInput.trim() })
    setChatInput('')
  }

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        useMeetingStore.getState().setScreenStream(null)
        useMeetingStore.getState().toggleScreenShare()
      } else {
        await startScreenShare()
      }
    } catch { toast.error('Screen share failed') }
  }

  const endMeeting = async () => {
    if (!window.confirm('End meeting for everyone?')) return
    setIsEnding(true)
    try {
      await api.post(`/meetings/${meetingId}/end`)
      navigate('/dashboard')
      toast.success('Meeting ended')
    } catch { setIsEnding(false) }
  }

  const leaveMeeting = () => {
    cleanup()
    navigate('/dashboard')
    toast('Left the meeting', { icon: '👋' })
  }

  const loadAISummary = async () => {
    setLoadingSummary(true)
    setPanel('ai')
    try {
      const { data } = await api.get(`/meetings/${meetingId}/summary`)
      setAiSummary(data.data.summary)
    } catch { toast.error('No summary available yet') }
    finally { setLoadingSummary(false) }
  }

  const allTiles = [
    { id: 'local', stream: localStream || undefined, name: user?.name || 'You', isMuted, isVideoOff, isLocal: true },
    ...participants.map(p => ({
      id: p.user._id, stream: p.stream, name: p.user.name,
      isMuted: p.isMuted, isVideoOff: p.isVideoOff, isLocal: false,
    }))
  ]

  const gridCols = allTiles.length <= 1 ? 'grid-cols-1' :
    allTiles.length <= 2 ? 'grid-cols-2' :
    allTiles.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="h-screen bg-[#0a0a14] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0f0f1a] border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">IM</span>
          </div>
          <span className="text-slate-300 font-medium text-sm hidden sm:block">{meetingId}</span>
          <button onClick={() => { navigator.clipboard.writeText(meetingId!); toast.success('Meeting ID copied') }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <Copy size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/15 rounded-lg">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs font-medium">LIVE</span>
          </div>
          <span className="text-slate-400 text-xs">{allTiles.length} participant{allTiles.length !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={loadAISummary} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/25 transition-colors">
          <Brain size={14} />
          AI Summary
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className={cn("grid gap-3 h-full", gridCols)}>
            {allTiles.map(tile => (
              <VideoTile key={tile.id} {...tile} />
            ))}
          </div>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {panel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0f0f1a] border-l border-slate-800/60 flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Panel tabs */}
              <div className="flex border-b border-slate-800/60">
                {[
                  { id: 'chat', icon: MessageSquare, label: 'Chat' },
                  { id: 'participants', icon: Users, label: 'People' },
                  { id: 'transcript', icon: FileText, label: 'Live' },
                  { id: 'ai', icon: Brain, label: 'AI' },
                ].map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => setPanel(id as PanelType)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                      panel === id ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"
                    )}>
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                {/* Chat panel */}
                {panel === 'chat' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center text-slate-500 text-sm mt-8">
                          <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                          No messages yet
                        </div>
                      )}
                      {chatMessages.map(msg => (
                        <div key={msg._id} className={cn("flex gap-2", msg.sender._id === user?._id && "flex-row-reverse")}>
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender.name}`}
                            className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                          <div className={cn("max-w-[70%]", msg.sender._id === user?._id && "items-end flex flex-col")}>
                            <p className="text-xs text-slate-500 mb-1">{msg.sender.name}</p>
                            <div className={cn(
                              "px-3 py-2 rounded-2xl text-sm",
                              msg.sender._id === user?._id
                                ? "bg-indigo-600 text-white rounded-tr-sm"
                                : "bg-slate-800 text-slate-200 rounded-tl-sm"
                            )}>
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-slate-800/60">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                          placeholder="Message..."
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendChat()}
                        />
                        <button onClick={sendChat} className="btn-primary px-3 py-2">
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants panel */}
                {panel === 'participants' && (
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-slate-500 px-1 mb-3">{allTiles.length} participants</p>
                    {[{ id: 'local', name: `${user?.name} (You)`, isMuted, isVideoOff }, ...participants.map(p => ({
                      id: p.user._id, name: p.user.name, isMuted: p.isMuted, isVideoOff: p.isVideoOff,
                    }))].map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`}
                          className="w-8 h-8 rounded-full" alt="" />
                        <span className="flex-1 text-sm text-slate-200 truncate">{p.name}</span>
                        <div className="flex gap-1.5">
                          {p.isMuted && <MicOff size={12} className="text-red-400" />}
                          {p.isVideoOff && <VideoOff size={12} className="text-red-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live transcript panel */}
                {panel === 'transcript' && (
                  <div className="p-3 space-y-3">
                    <p className="text-xs text-slate-500">Live transcription</p>
                    {transcript.length === 0 && (
                      <div className="text-center text-slate-500 text-sm mt-8">
                        <FileText size={24} className="mx-auto mb-2 opacity-30" />
                        Transcript will appear here
                      </div>
                    )}
                    {transcript.map((seg, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-indigo-400 font-medium text-xs">{seg.speaker}: </span>
                        <span className="text-slate-300">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Summary panel */}
                {panel === 'ai' && (
                  <div className="p-3 space-y-4">
                    {loadingSummary ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm">Generating AI summary...</p>
                      </div>
                    ) : aiSummary ? (
                      <>
                        <div>
                          <p className="text-xs text-purple-400 font-medium mb-2">📋 SUMMARY</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{aiSummary.summary}</p>
                        </div>
                        {aiSummary.keyPoints?.length > 0 && (
                          <div>
                            <p className="text-xs text-purple-400 font-medium mb-2">🔑 KEY POINTS</p>
                            <ul className="space-y-1.5">
                              {aiSummary.keyPoints.map((pt: string, i: number) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-300">
                                  <span className="text-purple-400 flex-shrink-0">•</span>
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSummary.actionItems?.length > 0 && (
                          <div>
                            <p className="text-xs text-purple-400 font-medium mb-2">✅ ACTION ITEMS</p>
                            <div className="space-y-2">
                              {aiSummary.actionItems.map((item: any, i: number) => (
                                <div key={i} className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                  <p className="text-sm text-slate-200">{item.text}</p>
                                  <span className={`badge text-xs mt-1 ${item.priority === 'high' ? 'badge-error' : item.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                                    {item.priority}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiSummary.sentiment && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>Meeting sentiment:</span>
                            <span className={`badge ${aiSummary.sentiment === 'positive' ? 'badge-success' : aiSummary.sentiment === 'negative' ? 'badge-error' : 'badge-info'}`}>
                              {aiSummary.sentiment}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-slate-500 text-sm mt-8">
                        <Brain size={24} className="mx-auto mb-2 opacity-30" />
                        <p>AI summary will be generated after the meeting ends.</p>
                        <button onClick={loadAISummary} className="mt-4 btn-primary text-xs px-4 py-2">
                          Generate Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0f0f1a] border-t border-slate-800/60 flex-shrink-0">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <ControlBtn icon={isMuted ? MicOff : Mic} active={!isMuted} danger={isMuted} onClick={toggleMute} label={isMuted ? 'Unmute' : 'Mute'} />
          <ControlBtn icon={isVideoOff ? VideoOff : Video} active={!isVideoOff} danger={isVideoOff} onClick={toggleVideo} label={isVideoOff ? 'Start Video' : 'Stop Video'} />
          <ControlBtn icon={isScreenSharing ? MonitorOff : Monitor} active={!isScreenSharing} onClick={handleScreenShare} label={isScreenSharing ? 'Stop Share' : 'Share Screen'} />
          <ControlBtn
            icon={Hand} active={!isHandRaised}
            onClick={() => { setIsHandRaised(!isHandRaised); getSocket()?.emit('meeting:reaction', { meetingId, emoji: '✋' }) }}
            label="Raise Hand"
          />
        </div>

        {/* Center panel toggles */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1">
          {[
            { id: 'chat', icon: MessageSquare },
            { id: 'participants', icon: Users },
            { id: 'transcript', icon: FileText },
            { id: 'ai', icon: Brain },
          ].map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setPanel(panel === id ? null : id as PanelType)}
              className={cn(
                "p-2.5 rounded-lg transition-all",
                panel === id ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
              )}>
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button onClick={leaveMeeting} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-600 transition-colors flex items-center gap-2">
            <Phone size={16} className="rotate-[135deg]" />
            Leave
          </button>
          <button onClick={endMeeting} disabled={isEnding} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
            End Meeting
          </button>
        </div>
      </div>
    </div>
  )
}

function ControlBtn({ icon: Icon, active, danger, onClick, label }: {
  icon: any; active?: boolean; danger?: boolean; onClick: () => void; label: string
}) {
  return (
    <button onClick={onClick} title={label}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all",
        danger ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" :
        active ? "text-slate-300 hover:bg-white/10 hover:text-white" :
        "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
      )}>
      <Icon size={20} />
      <span className="hidden sm:block">{label}</span>
    </button>
  )
}

function ArrowRight({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
}
