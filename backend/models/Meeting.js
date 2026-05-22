const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['host', 'co-host', 'participant'], default: 'participant' },
  joinedAt: { type: Date, default: Date.now },
  leftAt: Date,
  isMuted: { type: Boolean, default: false },
  isVideoOff: { type: Boolean, default: false },
  duration: { type: Number, default: 0 }, // in seconds
});

const actionItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: Date,
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
});

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: { type: String, maxlength: 500 },
  meetingId: {
    type: String,
    unique: true,
    default: () => uuidv4().substring(0, 12).replace(/-/g, '').toUpperCase(),
  },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  participants: [participantSchema],
  scheduledAt: { type: Date },
  startedAt: Date,
  endedAt: Date,
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'ended', 'cancelled'],
    default: 'scheduled',
  },
  type: {
    type: String,
    enum: ['instant', 'scheduled', 'recurring'],
    default: 'instant',
  },
  settings: {
    isRecordingEnabled: { type: Boolean, default: false },
    isTranscriptionEnabled: { type: Boolean, default: true },
    isChatEnabled: { type: Boolean, default: true },
    isScreenShareEnabled: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 50 },
    requireApproval: { type: Boolean, default: false },
    isPasswordProtected: { type: Boolean, default: false },
    password: { type: String, select: false },
  },
  recording: {
    url: String,
    public_id: String,
    duration: Number,
    size: Number,
  },
  transcript: {
    fullText: { type: String, default: '' },
    segments: [{
      speaker: String,
      text: String,
      startTime: Number,
      endTime: Number,
      confidence: Number,
    }],
    isProcessed: { type: Boolean, default: false },
  },
  aiSummary: {
    summary: String,
    keyPoints: [String],
    decisions: [String],
    actionItems: [actionItemSchema],
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    isGenerated: { type: Boolean, default: false },
    generatedAt: Date,
    accuracy: Number,
  },
  chat: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'file', 'reaction'], default: 'text' },
  }],
  notes: {
    content: { type: String, default: '' },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastEditedAt: Date,
  },
  tags: [String],
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for performance
meetingSchema.index({ meetingId: 1 });
meetingSchema.index({ host: 1, status: 1 });
meetingSchema.index({ 'participants.user': 1 });
meetingSchema.index({ team: 1, scheduledAt: -1 });
meetingSchema.index({ status: 1, scheduledAt: 1 });

// Virtual: duration in minutes
meetingSchema.virtual('durationMinutes').get(function () {
  if (!this.startedAt || !this.endedAt) return 0;
  return Math.round((this.endedAt - this.startedAt) / 60000);
});

meetingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Meeting', meetingSchema);
