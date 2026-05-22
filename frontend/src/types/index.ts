// ── User ──────────────────────────────────────────────────────────
export interface User {
  _id: string
  name: string
  email: string
  avatarUrl: string
  role: 'admin' | 'member' | 'guest'
  teams: Team[]
  isOnline: boolean
  lastSeen: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    language: string
  }
  createdAt: string
}

// ── Meeting ────────────────────────────────────────────────────────
export interface Meeting {
  _id: string
  meetingId: string
  title: string
  description?: string
  host: User
  team?: Team
  participants: Participant[]
  status: 'scheduled' | 'ongoing' | 'ended' | 'cancelled'
  type: 'instant' | 'scheduled' | 'recurring'
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  durationMinutes?: number
  settings: MeetingSettings
  recording?: { url: string; duration: number }
  transcript: { fullText: string; segments: TranscriptSegment[]; isProcessed: boolean }
  aiSummary?: AISummary
  chat: ChatMessage[]
  notes?: { content: string; lastEditedBy?: User; lastEditedAt?: string }
  tags: string[]
  isPublic: boolean
  createdAt: string
}

export interface Participant {
  _id: string
  user: User
  role: 'host' | 'co-host' | 'participant'
  joinedAt: string
  leftAt?: string
  isMuted: boolean
  isVideoOff: boolean
  duration: number
}

export interface MeetingSettings {
  isRecordingEnabled: boolean
  isTranscriptionEnabled: boolean
  isChatEnabled: boolean
  isScreenShareEnabled: boolean
  maxParticipants: number
  requireApproval: boolean
  isPasswordProtected: boolean
}

export interface TranscriptSegment {
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

export interface AISummary {
  summary: string
  keyPoints: string[]
  decisions: string[]
  actionItems: ActionItem[]
  sentiment: 'positive' | 'neutral' | 'negative'
  isGenerated: boolean
  generatedAt?: string
  accuracy?: number
}

export interface ActionItem {
  _id?: string
  text: string
  assignee?: User
  dueDate?: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
}

// ── Chat ───────────────────────────────────────────────────────────
export interface ChatMessage {
  _id: string
  sender: User
  message: string
  type: 'text' | 'file' | 'reaction'
  timestamp: string
}

// ── Team ───────────────────────────────────────────────────────────
export interface Team {
  _id: string
  name: string
  description?: string
  owner: User
  members: TeamMember[]
  inviteCode: string
  isPublic: boolean
  createdAt: string
}

export interface TeamMember {
  user: User
  role: 'admin' | 'member'
  joinedAt: string
}

// ── Task ───────────────────────────────────────────────────────────
export interface Task {
  _id: string
  title: string
  description?: string
  assignee?: User
  reporter: User
  team?: Team
  meeting?: string
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  labels: string[]
  position: number
  completedAt?: string
  createdAt: string
}

// ── Notification ───────────────────────────────────────────────────
export interface Notification {
  _id: string
  recipient: string
  sender?: User
  type: 'meeting_invite' | 'meeting_start' | 'action_item' | 'mention' | 'task_assigned' | 'team_invite'
  title?: string
  message?: string
  data?: Record<string, unknown>
  isRead: boolean
  readAt?: string
  createdAt: string
}

// ── API Response wrappers ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    pages: number
    limit: number
  }
}
