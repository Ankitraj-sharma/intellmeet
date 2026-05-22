const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: String,
  senderAvatar: String,
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message too long'],
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system', 'reaction'],
    default: 'text',
  },
  fileUrl: String,
  fileName: String,
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

chatMessageSchema.index({ meeting: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
