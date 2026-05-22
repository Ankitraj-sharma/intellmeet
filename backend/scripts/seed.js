require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Meeting.deleteMany({}),
      Task.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create demo users
    const users = await User.create([
      { name: 'Alex Johnson', email: 'demo@intellmeet.io', password: 'Demo1234!', role: 'admin', isEmailVerified: true },
      { name: 'Sarah Chen', email: 'sarah@intellmeet.io', password: 'Demo1234!', role: 'member', isEmailVerified: true },
      { name: 'Marcus Rivera', email: 'marcus@intellmeet.io', password: 'Demo1234!', role: 'member', isEmailVerified: true },
      { name: 'Priya Patel', email: 'priya@intellmeet.io', password: 'Demo1234!', role: 'member', isEmailVerified: true },
    ]);
    console.log(`Created ${users.length} demo users`);

    // Create demo team
    const team = await Team.create({
      name: 'Product Team',
      description: 'Cross-functional product development team',
      owner: users[0]._id,
      inviteCode: 'DEMO01',
      members: users.map((u, i) => ({ user: u._id, role: i === 0 ? 'admin' : 'member' })),
    });
    console.log('Created demo team');

    // Update users with team
    await User.updateMany({ _id: { $in: users.map(u => u._id) } }, { $addToSet: { teams: team._id } });

    // Create sample meetings
    const meetings = await Meeting.create([
      {
        title: 'Q2 Product Roadmap Review',
        host: users[0]._id,
        team: team._id,
        status: 'ended',
        type: 'scheduled',
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000),
        participants: users.map((u, i) => ({ user: u._id, role: i === 0 ? 'host' : 'participant' })),
        transcript: {
          fullText: 'Alex: Welcome everyone. Today we are reviewing our Q2 roadmap. Sarah: I think we should prioritize the AI features. Marcus: Agreed, the transcription module needs the most work. Priya: We should also focus on mobile responsiveness.',
          isProcessed: true,
        },
        aiSummary: {
          summary: 'The team reviewed and aligned on the Q2 product roadmap, focusing on AI feature development, transcription improvements, and mobile responsiveness.',
          keyPoints: [
            'AI features prioritized for Q2',
            'Transcription module identified as highest priority',
            'Mobile responsiveness added to roadmap',
            'Weekly check-ins scheduled for progress tracking',
          ],
          decisions: ['AI transcription module to be developed first', 'Mobile-first approach for new features'],
          actionItems: [
            { text: 'Create detailed specs for AI transcription module', priority: 'high', status: 'pending' },
            { text: 'Audit current mobile breakpoints', priority: 'medium', status: 'pending' },
            { text: 'Set up weekly roadmap review cadence', priority: 'low', status: 'completed' },
          ],
          sentiment: 'positive',
          isGenerated: true,
          generatedAt: new Date(),
          accuracy: 0.92,
        },
        tags: ['roadmap', 'q2', 'planning'],
      },
      {
        title: 'Weekly Engineering Standup',
        host: users[1]._id,
        team: team._id,
        status: 'ended',
        type: 'recurring',
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        participants: users.slice(0, 3).map((u, i) => ({ user: u._id, role: i === 1 ? 'host' : 'participant' })),
        aiSummary: {
          summary: 'Quick standup covering individual progress, blockers, and next steps for the week.',
          keyPoints: ['Frontend build times reduced by 30%', 'Backend API tests at 78% coverage', 'Deployment pipeline updated'],
          sentiment: 'positive',
          isGenerated: true,
          generatedAt: new Date(),
        },
        tags: ['standup', 'engineering'],
      },
      {
        title: 'Client Demo Prep',
        host: users[0]._id,
        team: team._id,
        status: 'scheduled',
        type: 'scheduled',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participants: [{ user: users[0]._id, role: 'host' }, { user: users[1]._id, role: 'participant' }],
        tags: ['client', 'demo'],
      },
    ]);
    console.log(`Created ${meetings.length} demo meetings`);

    // Create sample tasks
    await Task.create([
      { title: 'Implement AI transcription module', priority: 'high', status: 'in-progress', team: team._id, reporter: users[0]._id, assignee: users[1]._id, labels: ['ai', 'feature'] },
      { title: 'Audit mobile breakpoints across all pages', priority: 'medium', status: 'todo', team: team._id, reporter: users[0]._id, assignee: users[2]._id, labels: ['mobile', 'ui'] },
      { title: 'Set up weekly roadmap review cadence', priority: 'low', status: 'done', team: team._id, reporter: users[0]._id, assignee: users[0]._id, labels: ['process'] },
      { title: 'Write backend API tests (target 80% coverage)', priority: 'high', status: 'in-progress', team: team._id, reporter: users[1]._id, assignee: users[2]._id, labels: ['testing', 'backend'] },
      { title: 'Design new onboarding flow mockups', priority: 'medium', status: 'todo', team: team._id, reporter: users[3]._id, assignee: users[3]._id, labels: ['design', 'ux'] },
      { title: 'Optimize Dockerfile for smaller image size', priority: 'low', status: 'backlog', team: team._id, reporter: users[2]._id, labels: ['devops'] },
    ]);
    console.log('Created demo tasks');

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────');
    console.log('Demo login: demo@intellmeet.io');
    console.log('Password:   Demo1234!');
    console.log('─────────────────────────────');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
