const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMeetings,
      recentMeetings,
      pendingTasks,
      completedTasks,
      upcomingMeetings,
    ] = await Promise.all([
      Meeting.countDocuments({ $or: [{ host: userId }, { 'participants.user': userId }] }),
      Meeting.find({
        $or: [{ host: userId }, { 'participants.user': userId }],
        status: 'ended',
        endedAt: { $gte: thirtyDaysAgo },
      }).populate('host', 'name avatar').sort({ endedAt: -1 }).limit(5),
      Task.countDocuments({ assignee: userId, status: { $ne: 'done' } }),
      Task.countDocuments({ assignee: userId, status: 'done' }),
      Meeting.find({
        $or: [{ host: userId }, { 'participants.user': userId }],
        status: 'scheduled',
        scheduledAt: { $gte: new Date() },
      }).populate('host', 'name avatar').sort({ scheduledAt: 1 }).limit(5),
    ]);

    // Meeting frequency by week
    const weeklyMeetings = await Meeting.aggregate([
      {
        $match: {
          $or: [{ host: userId }, { 'participants.user': userId }],
          status: 'ended',
          endedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $week: '$endedAt' },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Action items stats
    const actionItemStats = await Meeting.aggregate([
      { $match: { $or: [{ host: userId }, { 'participants.user': userId }] } },
      { $unwind: '$actionItems' },
      {
        $group: {
          _id: '$actionItems.status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalMeetings,
        pendingTasks,
        completedTasks,
        productivityRate: completedTasks + pendingTasks > 0
          ? Math.round((completedTasks / (completedTasks + pendingTasks)) * 100)
          : 0,
      },
      recentMeetings,
      upcomingMeetings,
      weeklyMeetings,
      actionItemStats,
    });
  } catch (err) { next(err); }
});

router.get('/team/:teamId', async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalMeetings, completedMeetings, tasks] = await Promise.all([
      Meeting.countDocuments({ team: teamId }),
      Meeting.countDocuments({ team: teamId, status: 'ended' }),
      Task.find({ team: teamId }).populate('assignee', 'name avatar'),
    ]);

    const totalMinutes = await Meeting.aggregate([
      { $match: { team: teamId, status: 'ended' } },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalMeetings,
        completedMeetings,
        totalMinutes: totalMinutes[0]?.total ? Math.floor(totalMinutes[0].total / 60) : 0,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
