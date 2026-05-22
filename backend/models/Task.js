const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, maxlength: 1000 },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'in-progress', 'review', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  dueDate: Date,
  labels: [String],
  attachments: [{ name: String, url: String, public_id: String }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
  }],
  position: { type: Number, default: 0 },
  completedAt: Date,
}, { timestamps: true });

taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ meeting: 1 });

module.exports = mongoose.model('Task', taskSchema);
