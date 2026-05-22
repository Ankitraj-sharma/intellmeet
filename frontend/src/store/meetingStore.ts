import { create } from 'zustand'

interface Participant {
  _id: string
  user: { _id: string; name: string; avatarUrl: string }
  role: string
  isMuted: boolean
  isVideoOff: boolean
  socketId?: string
  stream?: MediaStream
  peerConnection?: RTCPeerConnection
}

interface ChatMessage {
  _id: string
  sender: { _id: string; name: string; avatarUrl: string }
  message: string
  type: string
  timestamp: string
}

interface TranscriptSegment {
  speaker: string
  text: string
  startTime: number
  timestamp: string
}

interface MeetingState {
  meetingId: string | null
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  isRecording: boolean
  participants: Participant[]
  chatMessages: ChatMessage[]
  transcript: TranscriptSegment[]
  notes: string
  localStream: MediaStream | null
  screenStream: MediaStream | null
  activeView: 'grid' | 'spotlight' | 'sidebar'
  spotlightUserId: string | null
  setMeetingId: (id: string | null) => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void
  toggleRecording: () => void
  addParticipant: (p: Participant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, updates: Partial<Participant>) => void
  addChatMessage: (msg: ChatMessage) => void
  addTranscriptSegment: (seg: TranscriptSegment) => void
  setNotes: (notes: string) => void
  setLocalStream: (stream: MediaStream | null) => void
  setScreenStream: (stream: MediaStream | null) => void
  setActiveView: (view: 'grid' | 'spotlight' | 'sidebar') => void
  setSpotlight: (userId: string | null) => void
  resetMeeting: () => void
}

const initialState = {
  meetingId: null, isMuted: false, isVideoOff: false, isScreenSharing: false,
  isRecording: false, participants: [], chatMessages: [], transcript: [],
  notes: '', localStream: null, screenStream: null, activeView: 'grid' as const, spotlightUserId: null,
}

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,
  setMeetingId: (meetingId) => set({ meetingId }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleVideo: () => set((s) => ({ isVideoOff: !s.isVideoOff })),
  toggleScreenShare: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  addParticipant: (p) => set((s) => ({ participants: [...s.participants.filter(x => x._id !== p._id), p] })),
  removeParticipant: (userId) => set((s) => ({ participants: s.participants.filter(p => p.user._id !== userId) })),
  updateParticipant: (userId, updates) => set((s) => ({
    participants: s.participants.map(p => p.user._id === userId ? { ...p, ...updates } : p),
  })),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  addTranscriptSegment: (seg) => set((s) => ({ transcript: [...s.transcript, seg] })),
  setNotes: (notes) => set({ notes }),
  setLocalStream: (localStream) => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setActiveView: (activeView) => set({ activeView }),
  setSpotlight: (spotlightUserId) => set({ spotlightUserId }),
  resetMeeting: () => set(initialState),
}))
