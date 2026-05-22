const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const meetingController = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.get('/analytics', meetingController.getAnalytics);
router.get('/', meetingController.getMeetings);
router.post('/', [
  body('title').trim().notEmpty().withMessage('Meeting title is required'),
], validate, meetingController.createMeeting);
router.get('/:meetingId', meetingController.getMeeting);
router.post('/:meetingId/join', meetingController.joinMeeting);
router.post('/:meetingId/end', meetingController.endMeeting);
router.patch('/:meetingId/transcript', meetingController.updateTranscript);
router.get('/:meetingId/summary', aiLimiter, meetingController.getMeetingSummary);
router.delete('/:id', meetingController.deleteMeeting);

module.exports = router;
