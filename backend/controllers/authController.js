const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');
const crypto = require('crypto');

const generateTokens = (user) => ({
  accessToken: user.generateAccessToken(),
  refreshToken: user.generateRefreshToken(),
});

// ✅ PRODUCTION COOKIE OPTIONS
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
};

// @desc    Register user
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });

    if (existing) {
      return next(new ApiError(400, 'Email already registered'));
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;

    await user.save({
      validateBeforeSave: false,
    });

    const userData = await User.findById(user._id)
      .select('-password -refreshToken');

    res
      .status(201)
      .cookie(
        'accessToken',
        accessToken,
        {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }
      )
      .cookie(
        'refreshToken',
        refreshToken,
        {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }
      )
      .json(
        new ApiResponse(
          201,
          {
            user: userData,
            accessToken,
            refreshToken,
          },
          'Registration successful'
        )
      );

  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      return next(new ApiError(401, 'Invalid email or password'));
    }

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;
    user.isOnline = true;
    user.lastSeen = new Date();

    await user.save({
      validateBeforeSave: false,
    });

    const userData = await User.findById(user._id)
      .select('-password -refreshToken');

    logger.info(`User logged in: ${user.email}`);

    res
      .status(200)
      .cookie(
        'accessToken',
        accessToken,
        {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }
      )
      .cookie(
        'refreshToken',
        refreshToken,
        {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }
      )
      .json(
        new ApiResponse(
          200,
          {
            user: userData,
            accessToken,
            refreshToken,
          },
          'Login successful'
        )
      );

  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
exports.logout = async (req, res, next) => {
  try {

    const token = req.headers.authorization?.split(' ')[1];

    const redis = getRedis();

    // Blacklist token
    if (redis && token) {

      const decoded = jwt.decode(token);

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        await redis.setex(
          `blacklist:${token}`,
          ttl,
          '1'
        );
      }
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 },
        isOnline: false,
        lastSeen: new Date(),
      }
    );

    res
      .status(200)
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json(
        new ApiResponse(
          200,
          {},
          'Logged out successfully'
        )
      );

  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {

    const incomingRefreshToken =
      req.cookies?.refreshToken ||
      req.body.refreshToken;

    if (!incomingRefreshToken) {
      return next(
        new ApiError(401, 'Refresh token required')
      );
    }

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id)
      .select('+refreshToken');

    if (
      !user ||
      user.refreshToken !== incomingRefreshToken
    ) {
      return next(
        new ApiError(
          401,
          'Invalid or expired refresh token'
        )
      );
    }

    const { accessToken, refreshToken } =
      generateTokens(user);

    user.refreshToken = refreshToken;

    await user.save({
      validateBeforeSave: false,
    });

    res
      .status(200)
      .cookie(
        'accessToken',
        accessToken,
        {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }
      )
      .cookie(
        'refreshToken',
        refreshToken,
        {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }
      )
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          'Tokens refreshed'
        )
      );

  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res, next) => {
  try {

    const user = await User.findById(req.user._id)
      .populate('teams', 'name avatar');

    res.json(
      new ApiResponse(
        200,
        { user },
        'User fetched successfully'
      )
    );

  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PATCH /api/v1/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {

    const { name, preferences } = req.body;

    const updateData = {};

    if (name) {
      updateData.name = name;
    }

    if (preferences) {
      updateData.preferences = {
        ...req.user.preferences,
        ...preferences,
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json(
      new ApiResponse(
        200,
        { user },
        'Profile updated successfully'
      )
    );

  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PATCH /api/v1/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id)
      .select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return next(
        new ApiError(
          400,
          'Current password is incorrect'
        )
      );
    }

    user.password = newPassword;

    await user.save();

    res.json(
      new ApiResponse(
        200,
        {},
        'Password changed successfully'
      )
    );

  } catch (error) {
    next(error);
  }
};