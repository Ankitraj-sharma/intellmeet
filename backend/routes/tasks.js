const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { teamId, assignee, status } = req.query;
    const query = {};
    if (teamId) query.team = teamId;
    if (assignee) query.assignee = assignee;
    if (status) query.status = status;
    const tasks = await Task.find(query)
      .populate('assignee', 'name avatarUrl')
      .populate('reporter', 'name avatarUrl')
      .sort({ position: 1, createdAt: -1 });
    res.json(new ApiResponse(200, { tasks }, 'Tasks fetched'));
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, reporter: req.user._id });
    await task.populate('assignee reporter', 'name avatarUrl');
    res.status(201).json(new ApiResponse(201, { task }, 'Task created'));
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignee reporter', 'name avatarUrl');
    if (!task) return next(new ApiError(404, 'Task not found'));
    res.json(new ApiResponse(200, { task }, 'Task updated'));
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json(new ApiResponse(200, {}, 'Task deleted'));
  } catch (error) { next(error); }
});

module.exports = router;
