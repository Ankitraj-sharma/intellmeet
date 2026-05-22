// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', async (req, res) => {
  const user = await User.findById(req.user._id).populate('teams', 'name avatar');
  res.json({ success: true, user });
});

router.put('/profile', async (req, res, next) => {
  try {
    const { name, preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, preferences } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      isActive: true,
    }).select('name email avatar role').limit(10);
    res.json({ success: true, users });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

module.exports = router;

// ============================================================

// routes/chat.js
const chatRouter = express.Router();
const ChatMessage = require('../models/ChatMessage');

chatRouter.use(protect);

chatRouter.get('/meetings/:meetingId', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ChatMessage.find({
      meeting: req.params.meetingId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name avatar');

    res.json({ success: true, messages: messages.reverse(), page: parseInt(page) });
  } catch (err) { next(err); }
});

chatRouter.delete('/:messageId', async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    message.isDeleted = true;
    await message.save();
    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) { next(err); }
});

module.exports = chatRouter;
