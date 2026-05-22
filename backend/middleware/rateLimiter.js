const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });

const globalLimiter = createLimiter(15, 300, 'Too many requests, please try again later');
const authLimiter = createLimiter(15, 10, 'Too many authentication attempts, please try again after 15 minutes');
const aiLimiter = createLimiter(1, 20, 'AI request limit reached, please wait a minute');

module.exports = { globalLimiter, authLimiter, aiLimiter };
