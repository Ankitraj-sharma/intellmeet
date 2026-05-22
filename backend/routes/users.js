const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { searchUsers, getUserById } = require('../controllers/userController');

router.use(protect);
router.get('/search', searchUsers);
router.get('/:id', getUserById);

module.exports = router;
