const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');

// @desc  Search users by name/email (for task assignment, team invite)
// @route GET /api/v1/users/search?q=...
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json(new ApiResponse(200, { users: [] }, 'OK'));

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
    })
      .select('name email avatarUrl isOnline lastSeen')
      .limit(10);

    res.json(new ApiResponse(200, { users }, 'Users found'));
  } catch (error) {
    next(error);
  }
};

// @desc  Get user profile by ID
// @route GET /api/v1/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email avatarUrl isOnline lastSeen role teams')
      .populate('teams', 'name');

    if (!user) {
      const ApiError = require('../utils/ApiError');
      return next(new ApiError(404, 'User not found'));
    }

    res.json(new ApiResponse(200, { user }, 'User fetched'));
  } catch (error) {
    next(error);
  }
};
