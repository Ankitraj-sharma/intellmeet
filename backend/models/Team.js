const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: 50,
  },
  description: { type: String, maxlength: 300 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  avatar: { url: String, public_id: String },
  inviteCode: { type: String, unique: true },
  isPublic: { type: Boolean, default: false },
  settings: {
    allowMembersToCreateMeetings: { type: Boolean, default: true },
    defaultMeetingDuration: { type: Number, default: 60 },
  },
}, { timestamps: true });

teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ inviteCode: 1 });

module.exports = mongoose.model('Team', teamSchema);
