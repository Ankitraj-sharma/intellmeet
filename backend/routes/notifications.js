const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json(new ApiResponse(200, { notifications, unreadCount }, 'Notifications fetched'));
  } catch (error) { next(error); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json(new ApiResponse(200, {}, 'All notifications marked as read'));
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json(new ApiResponse(200, {}, 'Notification read'));
  } catch (error) { next(error); }
});

module.exports = router;
