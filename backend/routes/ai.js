const express = require('express');
const router = express.Router();
const { generateSummary, extractActionItems, addTranscriptEntry, getMeetingInsights } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/meetings/:id/summarize', generateSummary);
router.post('/meetings/:id/extract-actions', extractActionItems);
router.post('/meetings/:id/transcribe', addTranscriptEntry);
router.get('/meetings/:id/insights', getMeetingInsights);

module.exports = router;
