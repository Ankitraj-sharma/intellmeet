const cloudinary = require('cloudinary').v2;
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc  Upload avatar
// @route POST /api/v1/upload/avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, 'No file provided'));

    // Delete old avatar if exists
    const user = await User.findById(req.user._id);
    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    // Upload to Cloudinary via buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'intellmeet/avatars', width: 200, height: 200, crop: 'fill', quality: 'auto' },
        (err, result) => { if (err) reject(err); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    await User.findByIdAndUpdate(req.user._id, {
      avatar: { public_id: uploadResult.public_id, url: uploadResult.secure_url },
    });

    res.json(new ApiResponse(200, {
      avatarUrl: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    }, 'Avatar uploaded'));
  } catch (error) {
    next(error);
  }
};
