const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');

router.use(protect);

// Create team
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const team = await Team.create({
      name, description,
      owner: req.user._id,
      inviteCode,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });
    res.status(201).json(new ApiResponse(201, { team }, 'Team created'));
  } catch (error) { next(error); }
});

// Get user's teams
router.get('/', async (req, res, next) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('owner', 'name avatarUrl')
      .populate('members.user', 'name avatarUrl email');
    res.json(new ApiResponse(200, { teams }, 'Teams fetched'));
  } catch (error) { next(error); }
});

// Get team by ID
router.get('/:id', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'name avatarUrl')
      .populate('members.user', 'name avatarUrl email isOnline lastSeen');
    if (!team) return next(new ApiError(404, 'Team not found'));
    const isMember = team.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError(403, 'Access denied'));
    res.json(new ApiResponse(200, { team }, 'Team fetched'));
  } catch (error) { next(error); }
});

// Join via invite code
router.post('/join/:inviteCode', async (req, res, next) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.inviteCode });
    if (!team) return next(new ApiError(404, 'Invalid invite code'));
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) return next(new ApiError(400, 'Already a member'));
    team.members.push({ user: req.user._id, role: 'member' });
    await team.save();
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });
    res.json(new ApiResponse(200, { team }, 'Joined team'));
  } catch (error) { next(error); }
});

module.exports = router;
